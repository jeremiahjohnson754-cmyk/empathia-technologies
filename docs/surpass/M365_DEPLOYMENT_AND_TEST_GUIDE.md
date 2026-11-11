# Microsoft 365 — deployment and testing guide for real validation

For the calendar adapter and the app jumps of the Connect slice (`apps/demo/src/connect/`; design in [CONNECT.md](CONNECT.md)).
Written 2026-11-11. Founder, 11 November 2026: "Create a precise deployment and testing guide explaining which permissions, test
accounts, configuration, and devices are required for real validation."

> **NOT CONNECTED.** Nothing in this guide has been carried out. There is no Microsoft 365 tenant, no app registration, no test
> account and no device lab for this project. The demonstration runs on a simulated calendar; the Microsoft Graph adapter
> (`graph.ts`) is **mock-tested** only. This guide says what a person with a tenant needs to do to find out whether it works.

**How to read the sources.** Every Microsoft Graph call, permission and link format below was read on Microsoft's own page (or the
RFC) on 2026-11-11 and carries that page. Where a step rests on a page that was **found but not read** that day, it says so, and the
step is to follow that page rather than this guide.

## 1. What is being validated

| | In the repository | To validate for real |
|---|---|---|
| Calendar adapter | `graphAdapter(cfg)` in `graph.ts`: builds each request and reads each documented response | The same six operations against a real tenant: people lookup, schedule lookup, Shifts, suggestions, create with a transaction id, cancel |
| App jumps | `apps.ts`: Teams chat, Teams call, Teams scheduling form, mailto, tel | Each link followed on each device in §6, with and without the app installed |
| Booking flow | Propose → review → explicit confirm, re-check at confirm, idempotent | The same flow ending in one real event, one invitation per attendee, and none before the confirmation |

## 2. Microsoft Graph permissions — least privilege

Request only the permissions in the first table. Each is the **least-privileged** permission the call's page lists.

| Permission | Kind | Why it is needed | Official page (read 2026-11-11) |
|---|---|---|---|
| User.ReadBasic.All | Delegated | Find a person by name | https://learn.microsoft.com/graph/api/user-list |
| User.Read.All | Application | Find a person by name | https://learn.microsoft.com/graph/api/user-list |
| Calendars.ReadBasic | Delegated | Free/busy and working hours of people and rooms | https://learn.microsoft.com/en-us/graph/api/calendar-getschedule |
| Calendars.ReadBasic | Application | Free/busy and working hours of people and rooms | https://learn.microsoft.com/en-us/graph/api/calendar-getschedule |
| Calendars.Read.Shared | Delegated | Meeting-time suggestions | https://learn.microsoft.com/graph/api/user-findmeetingtimes |
| Calendars.ReadWrite | Delegated | Create the event; Cancel the event | https://learn.microsoft.com/en-us/graph/api/user-post-events https://learn.microsoft.com/en-us/graph/api/event-cancel |
| Calendars.ReadWrite | Application | Create the event; Cancel the event | https://learn.microsoft.com/en-us/graph/api/user-post-events https://learn.microsoft.com/en-us/graph/api/event-cancel |
| Schedule.Read.All | Delegated | Shifts of a Teams team | https://learn.microsoft.com/en-us/graph/api/resources/shift |
| Schedule.Read.All | Application | Shifts of a Teams team | https://learn.microsoft.com/en-us/graph/api/resources/shift |

Per call:

| Id | What | Signed-in user (delegated) | Application | Least-privileged delegated permission | Least-privileged application permission | Success | Source (read 2026-11-11) | Page's own date |
|---|---|---|---|---|---|---|---|---|
| `people` | Find a person by name (people lookup) | `GET /users` | `GET /users` | User.ReadBasic.All | User.Read.All | 200 | https://learn.microsoft.com/graph/api/user-list | 2025-07-23 |
| `schedule` | Free/busy and working hours of people and rooms (schedule lookup) | `POST /me/calendar/getSchedule` | `POST /users/{id|userPrincipalName}/calendar/getSchedule` | Calendars.ReadBasic | Calendars.ReadBasic | 200 | https://learn.microsoft.com/en-us/graph/api/calendar-getschedule | 2025-07-23 |
| `suggest` | Meeting-time suggestions (findMeetingTimes): a cross-check, not the primary path | `POST /me/findMeetingTimes` | Not supported | Calendars.Read.Shared | Not supported | 200 | https://learn.microsoft.com/graph/api/user-findmeetingtimes | 2024-04-04 |
| `create` | Create the event (this is what sends invitations) | `POST /me/events` | `POST /users/{id | userPrincipalName}/events` | Calendars.ReadWrite | Calendars.ReadWrite | 201 | https://learn.microsoft.com/en-us/graph/api/user-post-events | not shown |
| `cancel` | Cancel the event (the organiser only; sends a cancellation) | `POST /me/events/{id}/cancel` | `POST /users/{id | userPrincipalName}/events/{id}/cancel` | Calendars.ReadWrite | Calendars.ReadWrite | 202 | https://learn.microsoft.com/en-us/graph/api/event-cancel | 2024-06-21 |
| `shifts` | Shifts of a Teams team (who is on shift when) | `GET /teams/{teamId}/schedule/shifts` | `GET /teams/{teamId}/schedule/shifts` | Schedule.Read.All | Schedule.Read.All | 200 | https://learn.microsoft.com/en-us/graph/api/resources/shift | 2025-02-04 |

- **`people`**: $search="displayName:…" needs the header ConsistencyLevel: eventual and $count=true. Personal Microsoft accounts are not supported. Higher-privileged alternatives the page lists: User.Read.All, User.ReadWrite.All, Directory.Read.All, Directory.ReadWrite.All.
- **`schedule`**: availabilityViewInterval: default 30 minutes, minimum 5, maximum 1440. Without Prefer: outlook.timezone the times come back in UTC. A slot holding more than 1000 entries is answered with error 5006. The page states no limit on the number of addresses: not chunked here; to observe in real validation. Higher-privileged alternatives the page lists: Calendars.Read, Calendars.ReadWrite.
- **`suggest`**: Application permissions and personal accounts: Not supported. Works inside the mailbox’s work hours unless activityDomain says otherwise; knows nothing about Shifts. meetingDuration is ISO 8601 (PT30M); the default is 30 minutes. Higher-privileged alternatives the page lists: Calendars.ReadWrite.Shared.
- **`create`**: transactionId: “A custom identifier specified by a client app for the server to avoid redundant POST operations in case of client retries to create the same event” (https://learn.microsoft.com/en-us/graph/api/resources/event). A room is invited as an attendee of type resource, with its mailbox address. NOT STATED on the pages read: what the server answers to a second POST with the same transactionId. The mock assumes the first event is returned; to observe in real validation.
- **`cancel`**: An attendee who calls it gets HTTP 400: “You need to be an organizer to cancel a meeting.”. Returns 202 Accepted and no body.
- **`shifts`**: The v1.0 shift resource page lists the List method; its request line and example were read on the beta-version page of the same article (https://learn.microsoft.com/cs-cz/graph/api/schedule-list-shifts?view=graph-rest-beta, updated 2025-07-23). The v1.0 List page itself was not read. $filter may name a property once: sharedShift/startDateTime ge … and sharedShift/endDateTime le …. A shift is at most 24 hours; a shift identifies its person by userId (the directory object id). Higher-privileged alternatives the page lists: Schedule.ReadWrite.All, Group.Read.All, Group.ReadWrite.All.

Choose **one** kind of access and request only its column:

- **Delegated** (a person signs in; the app acts as that person and can do no more than they can). The organiser is `/me`. Needed
  if `findMeetingTimes` is wanted as a cross-check: its page says application permissions are "Not supported".
  Set: `User.ReadBasic.All`, `Calendars.ReadBasic`, `Calendars.ReadWrite`, `Schedule.Read.All`, and `Calendars.Read.Shared` only if
  `findMeetingTimes` is used.
- **Application** (no signed-in user; the app acts on a named mailbox, `/users/{id | userPrincipalName}/…`). Set: `User.Read.All`,
  `Calendars.ReadBasic`, `Calendars.ReadWrite`, `Schedule.Read.All`. An application permission on calendars reaches **every**
  mailbox in the tenant unless the tenant restricts it; restricting it to the test mailboxes is a tenant-administration step whose
  Microsoft page was **not read on 2026-11-11**. Do not grant application permissions in a production tenant for this validation.

Do **not** request the higher-privileged alternatives the pages list (`Calendars.Read`, `Calendars.ReadWrite.Shared`, `Group.Read.All`,
`Directory.Read.All` and so on). `Calendars.ReadWrite` is the only write permission, and it is needed for exactly two calls: create
and cancel.

**Admin consent.** Which of these permissions a user may consent to and which need an administrator is stated in Microsoft's
permissions reference, which was **not read on 2026-11-11**. Treat every permission above as needing an administrator's consent
until the tenant's administrator confirms otherwise; application permissions are always granted by an administrator.

Throttling and errors (how the adapter behaves, and what to look for):

- **throttling** — HTTP 429 with a Retry-After header: wait that many seconds, retry the request; without the header, back off exponentially. Source: https://learn.microsoft.com/graph/throttling (page updated 2025-01-15; read 2026-11-11).
- **errors** — 401: authentication missing or not valid. 403: the user does not have enough permission or a required licence. The body is { error: { code, message, innerError } }; the message is not shown to people. Source: https://learn.microsoft.com/en-us/graph/errors (page updated 2025-08-06; read 2026-11-11).

## 3. App registration and admin consent

The two Microsoft pages for these steps were **found by search on 2026-11-11 but their content was not read** (the page reader was
unavailable). The steps below are the outline to check against those pages, not a substitute for them:

- Register an application: https://learn.microsoft.com/entra/identity-platform/quickstart-register-app (found, not read)
- Grant tenant-wide admin consent: https://learn.microsoft.com/entra/identity/enterprise-apps/grant-admin-consent (found, not read)

1. In a **test tenant** (never a production tenant), an administrator registers one application for this validation. Single tenant.
2. Record the application (client) id and the directory (tenant) id as configuration (§5). They are identifiers, not secrets.
3. For **delegated** access: add a redirect address for the surface that will sign in. The demonstration is a static single page with
   `Content-Security-Policy: default-src 'self'`; it cannot call Microsoft Graph from the browser as it stands, and it must not hold a
   secret. A connected product therefore needs a **server-side** component that holds the credential and makes the Graph calls. That
   component does not exist; building it is part of the work this guide precedes.
4. For **application** access: create a credential for the application (a certificate is preferable to a client secret), stored in the
   server-side secret store. **Never** in the repository, the page, a URL, a log or this document.
5. Add the Microsoft Graph permissions of §2 for the chosen kind of access — those and no others.
6. An administrator grants consent for the tenant.
7. Confirm what was granted by reading the application's permission list back, and record the list with the date.

## 4. Test accounts and mailboxes

All in the test tenant. Names are placeholders; use the tenant's own verified domain.

| Account | Set up | Used for |
|---|---|---|
| **User A — organiser** | A licensed mailbox with Teams. Mailbox time zone and work hours set to a US zone (for example Central Time, Mon–Fri 08:00–17:00) | Signs in (delegated), or is the mailbox the application acts on. Organises every test meeting |
| **User B — colleague in another time zone** | A licensed mailbox with Teams. Mailbox time zone set to a zone that changes its clocks on **different dates** from User A's (for example London), with its own work hours | Schedule lookup across zones; the daylight-saving steps of §7 |
| **User S — shift worker** | A licensed mailbox with Teams; a member of a Teams team that has Shifts set up; at least one week of **shared** (published) shifts and one **draft** shift that is not shared | Shifts; a proposal must fall inside a shared shift and never inside the draft |
| **Room R — room mailbox** | A room resource mailbox that accepts and declines automatically | Free/busy of a room; invited as an attendee of type `resource`; its accept or decline observed after create |
| **User N — WITHOUT permission** | A licensed user who has **not** been granted (or has had revoked) what the others have: for delegated access, a user who declines consent or is outside the app's assignment; for application access, run the same calls with an app registration that lacks `Calendars.ReadWrite` | Negative tests: 401/403 must produce "Not authorised; ask your administrator for <permission>", and nothing may be created |

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
| Zone names | `WINDOWS_ZONE` in `graph.ts`: the Windows time-zone names the adapter can read. Add the test tenant's names after step 7.5 | No | Source |

The adapter takes a `transport` and a `token` function from its caller. For validation they are supplied by the server-side component
of §3; the demonstration never supplies them.

## 6. Devices

| Device | With the app | Without the app |
|---|---|---|
| **Android phone** (current Android, Chrome) | Teams and Outlook installed and signed in as User A | Teams and Outlook uninstalled; browser signed in to nothing |
| **iPhone** (current iOS, Safari) | Teams and Outlook installed and signed in as User A | Teams and Outlook uninstalled |
| Windows or macOS computer (Edge or Chrome) | Teams desktop installed and signed in | Teams not installed; Teams on the web signed in, then signed out |

On each, note which app is the default handler for `mailto:` and `tel:` links before testing.

## 7. Real-validation script

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
4. *Shifts.* `shifts(Monday, Saturday)`. **Expect** User S's shared shifts with the right start and end; the draft shift **absent**.
5. *Suggestions.* `suggest({A, B, room R, 30 minutes, next 5 days})`. **Expect** every suggestion inside both people's work hours in
   their own zones, clear of every seeded block and of Room R's bookings. Compare with `native()` (`findMeetingTimes`, delegated
   only): differences are expected; record them.
6. *Shift worker.* `suggest({A, S, 30 minutes})`. **Expect** every suggestion inside one of S's shared shifts.
7. *Daylight saving.* Repeat step 5 for a week in which only one of A's and B's zones has changed its clocks. **Expect** the
   suggested instants to shift by one hour for the zone that changed and not for the other.

**B. Negative tests (still nothing may be created)**

8. *No permission, read.* As User N (or the app without the permission): `schedule([A])`. **Expect** "Not authorised; ask your
   administrator for Calendars.ReadBasic (… permission, Microsoft Graph)". Record the real status code and error body.
9. *No permission, write.* As User N: `create(...)`. **Expect** "Not authorised; ask your administrator for Calendars.ReadWrite"; then
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
| Pages found but not read on 2026-11-11 | App registration; admin consent; the permissions reference; the v1.0 "List shifts" page | Read them before step 1 |

Link formats the app jumps use, with their sources, are in [CONNECT.md §4](CONNECT.md).
