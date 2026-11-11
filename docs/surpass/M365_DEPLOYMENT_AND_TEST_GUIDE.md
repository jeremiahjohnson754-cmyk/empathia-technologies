# Microsoft 365: what is needed to validate Empathia against a real tenant

Founder, 11 November 2026 (02:25): "Finish the correct Microsoft Graph adapter architecture, Teams and Outlook deep-link actions,
availability and scheduling workflows, permission handling, and contract/integration tests using deterministic simulations and mocks.
Keep real Microsoft 365 tenant validation, actual event creation, live Teams interactions, and physical mobile QA clearly marked as
pending. Do not present these as verified production integrations. Create a precise deployment and testing guide explaining which
permissions, test accounts, configuration, and devices are required for real validation."

This is that guide. It is written before the code it describes is merged: the people, contact-action and scheduling lane was stopped
by the usage limit on 11 November and resumes after it resets. Nothing in this document has been run against a tenant.

## 1. Status, in the directive's words

| Capability | Specified | Implemented | Tested | Lab-verified | Customer-authorised | Released |
|---|---|---|---|---|---|---|
| Teams and Outlook deep links (formats below) | yes | in progress (lane not merged) | no | **pending** | no | no |
| Availability and meeting-time proposal | yes | in progress, simulated calendar | no | **pending** | no | no |
| Event creation with confirmation, re-check and idempotent retry | yes | in progress, simulated | no | **pending** | no | no |
| Graph adapter (request building, response parsing, errors, throttling) | yes | in progress, against a mock transport | no | **pending** | no | no |
| Shifts awareness | yes | in progress, simulated | no | **pending** | no | no |
| SharePoint knowledge ingestion (selected sites, delta, revocation) | yes | in progress, simulated source | no | **pending** | no | no |
| Real tenant validation, actual event creation, live Teams interaction, physical mobile QA | — | — | — | **pending: needs everything in §4–§6** | — | — |

"Simulated" means a deterministic stand-in inside the demonstration. "Mock transport" means the adapter's real request is built and
checked against a recorded response shape taken from the documentation; no network call is made. Neither is a verified integration.

## 2. The formats and calls, each from the vendor's own page

Every row was read on learn.microsoft.com on **2026-11-11**. A format that could not be confirmed there is listed as not verified and
is not offered in the product.

### Deep links (open an app; they complete nothing)

| Action | Format | What the page says | Source |
|---|---|---|---|
| Start or open a Teams chat | `https://teams.microsoft.com/l/chat/0/0?users=<user1>,<user2>,...&topicName=<chat name>&message=<precanned text>` | `users` are Microsoft Entra user principal names only; `message` is placed in the compose box "while the chat is in a draft state"; "If a chat already exists deep link opens in that chat." Nothing is sent. | [Deep links for workflows in Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-workflow) (page dated 2026-06-23) |
| Start a Teams call | `https://teams.microsoft.com/l/call/0/0?users=<user1>,<user2>` and `&withVideo=true` | "Before Teams places the call, the client prompts for a confirmation." "This method can't be used for invoking a meeting." | same page |
| Open the Teams meeting scheduling dialog | `https://teams.microsoft.com/l/meeting/new?subject=<meeting subject>&startTime=<date>&endTime=<date>&content=<content>&attendees=<user1>,<user2>,...` | Times in long ISO 8601 with the UTC offset; "You can't specify the location as it isn't supported."; spaces must be `%20`, never `+`. It opens a dialog the person completes; it does not create a meeting. | same page |
| Email | `mailto:` | The standard is RFC 6068. Not re-read today; the format is the long-standing one. | IETF RFC 6068 |
| Phone | `tel:` | The standard is RFC 3966. Not re-read today. | IETF RFC 3966 |
| Outlook on the web: compose | — | **Not verified** on an official page today. Not offered until it is. | — |
| "Get the app" links | — | None is generated. If an app is not installed the person is told so and offered the documented web address above. | founder: "Do not generate speculative download URLs." |

### Microsoft Graph calls a connected adapter would make

| Purpose | Call | Least-privileged permission (as published) | Notes from the page | Source |
|---|---|---|---|---|
| Free/busy and working hours of people and rooms | `POST /users/{id\|userPrincipalName}/calendar/getSchedule` | Delegated `Calendars.ReadBasic`; Application `Calendars.ReadBasic` | Body: `schedules` (SMTP addresses), `startTime`, `endTime`, `availabilityViewInterval` (5 to 1440 minutes, default 30). Returns per address an `availabilityView`, `scheduleItems` and `workingHours` (days, start, end, time zone). | [calendar: getSchedule](https://learn.microsoft.com/en-us/graph/api/calendar-getschedule?view=graph-rest-1.0) |
| Meeting-time suggestions | `POST /users/{id\|userPrincipalName}/findMeetingTimes` | Delegated `Calendars.Read.Shared`. **Application: not supported.** | Uses the organiser's and attendees' work hours by default (`activityDomain: work`); returns suggestions with a confidence and, on request, a reason; says why when it has none (`emptySuggestionsReason`). Because application permission is not supported, an unattended service cannot use it: the adapter computes proposals from `getSchedule` instead and may use this call only on a signed-in person's behalf. | [user: findMeetingTimes](https://learn.microsoft.com/en-us/graph/api/user-findmeetingtimes?view=graph-rest-1.0) |
| Create the meeting | `POST /users/{id\|userPrincipalName}/events` | Delegated `Calendars.ReadWrite`; Application `Calendars.ReadWrite` | `isOnlineMeeting: true` with `onlineMeetingProvider: "teamsForBusiness"` makes it a Teams meeting; success is `201 Created`. The page's example "sets the transactionId property to reduce unnecessary retries on the server". The adapter sends a client-generated `transactionId` on every create and on every retry of the same confirmation; how long the service honours it is **to be measured in validation**, not assumed. | [Create event](https://learn.microsoft.com/en-us/graph/api/user-post-events?view=graph-rest-1.0) |
| Shifts | `GET /teams/{teamId}/schedule/shifts` | Delegated `Schedule.Read.All`; Application `Schedule.Read.All` | `$filter` on `sharedShift` start and end; the same property cannot be used twice in one filter. | [List shifts](https://learn.microsoft.com/en-us/graph/api/schedule-list-shifts?view=graph-rest-1.0) |
| Knowledge from selected SharePoint sites | `Sites.Selected` (and the narrower `Lists.SelectedOperations.Selected`, `ListItems.SelectedOperations.Selected`, `Files.SelectedOperations.Selected`) | Application, granted per site by an administrator: `POST /sites/{siteId}/permissions` with a role (`read`, `write`, `owner`, `fullcontrol`) | Three steps are all required: consent to the scope, grant the app a role on the resource, and a token carrying the scope. Granting below site level breaks permission inheritance on that resource. Empathia asks for `read` only. | [Selected permissions overview](https://learn.microsoft.com/en-us/graph/permissions-selected-overview) |
| Being throttled | any | — | `429 Too Many Requests` with `Retry-After`: wait that many seconds, retry, repeat while throttled; with no header, exponential backoff; "Avoid immediate retries, because all requests accrue against your usage limits." | [Throttling guidance](https://learn.microsoft.com/en-us/graph/throttling) |

## 3. How the product behaves around these calls (the rules the tests hold)

1. Opening an app is reported as "Opened Teams", never as "sent", "called" or "booked".
2. A meeting is proposed, reviewed, and created only on an explicit confirmation by the person. At confirmation availability is read
   again; if a slot was taken, nothing is created and new proposals are shown.
3. One confirmation creates at most one event: the same client-generated identifier is sent on every retry.
4. A `401` or `403` is shown as what it is: not authorised, with the permission to ask an administrator for. It is never retried.
5. A `429` waits for `Retry-After`. A retry never creates a second event.
6. Asking Harmony to book does not grant Harmony permission to book: the same authority check and the same confirmation apply.
7. Contact details are shown only to roles permitted to see them, and prefilled text never carries what the reader's role cannot see.

## 4. What an administrator must set up

1. **A test tenant** (not production), with Teams, Exchange Online and SharePoint Online licensed for the test accounts.
2. **An app registration** in Microsoft Entra ID for Empathia's test deployment: a redirect address for the sign-in flow; delegated
   permissions `Calendars.ReadBasic`, `Calendars.Read.Shared`, `Calendars.ReadWrite`, `Schedule.Read.All`, `User.Read`; application
   permission `Sites.Selected` only if knowledge ingestion is being validated. Admin consent is given once, by a tenant administrator.
   Start with delegated permissions only: every action is then limited to what the signed-in person may do.
3. **Per-site grant** for ingestion: `read` on the one test site, through `POST /sites/{siteId}/permissions`.
4. **Configuration values** handed to the deployment, never to a chat or a repository: tenant id, client id, the client secret or
   certificate (in the hosting platform's secret store), the redirect address, the test site id, the test team id for Shifts.

## 5. Test accounts

| Account | Why |
|---|---|
| Organiser A, time zone 1 | Signs in, proposes and confirms meetings |
| Attendee B, a different time zone | Proves each person is shown their own local time and working hours |
| Shift worker C, with shifts in a Teams schedule | Proves a proposal never lands outside a shift |
| Room mailbox R | Proves room availability is read and the room is booked with the meeting |
| User D with **no** consent or licence for the calendar scopes | The negative case: the refusal is shown in words and nothing is retried |
| A second tenant's user E (optional) | Proves nothing from tenant 1 is visible from tenant 2 |

## 6. Devices

One Android phone and one iPhone, each tested in two states: Teams and Outlook installed and signed in; and neither installed. One
Windows or macOS desktop with the Teams desktop client. Deep links must be opened from Empathia in the device's default browser.

## 7. The validation script (to be run by a person; expected results beside each step)

1. As A, open a person's profile and choose **Message in Teams** → Teams opens to a chat with that person; the compose box holds the
   prefilled text; nothing has been sent. Empathia says "Opened Teams".
2. Same on a phone without Teams → the person is told Teams is not installed and offered the web address; no store link is invented.
3. **Call** → Teams asks for confirmation before placing the call.
4. Ask for 30 minutes with B and C this week in room R → every proposal is inside A's, B's and C's working hours and C's shift, R is
   free, and each attendee's local time is shown.
5. Confirm a proposal → one event exists in A's calendar with B, C and R; it is a Teams meeting with a join link; Empathia shows the
   event's identifier. Record the `201` response.
6. Before confirming another proposal, book R for that time from Outlook → at confirmation Empathia refuses, says R is taken, and
   proposes again. Nothing was created.
7. Confirm, and cut the network after the request leaves → on reconnect Empathia retries with the same identifier; exactly one event
   exists. Record how the service answered the retry.
8. As D → the refusal names the missing permission; the request is not repeated.
9. Force a `429` (a burst of availability reads) → Empathia waits for `Retry-After`; no duplicate event; the person is told it is waiting.
10. Cancel the meeting from Empathia → the event is cancelled for every attendee and the room.
11. Ingestion: connect the test site with `read`; import; remove a reader from one document in SharePoint; sync → that reader no longer
    finds the document, its snippets or its citations in Empathia. Delete a document; sync → it is gone from search.
12. Repeat 1–5 on the second phone platform. Record device, OS version, app versions and screenshots for each step.

A step is **verified** only when a person has run it on the named account and device and the evidence is filed. Until then every row
in §1 stays "pending".
