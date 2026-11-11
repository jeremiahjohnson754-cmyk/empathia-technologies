# Connect — people, contact actions, app jumps and schedule-aware meetings

Slice: `apps/demo/src/connect/` (branch `agent/connect-people-actions-2`). Founder, 11 November 2026: the buttons between the people,
the process, the technology and the communications must work; a meeting is never booked silently; an invitation is never sent
without the person's authorisation; no download address is ever guessed; opening an app is not completing an action.

**Status: Tested (simulated adapter).** The Microsoft Graph adapter is **mock-tested**. Nothing here is more than that.

**One Connect.** Two implementations were written on 11 November 2026: this one, and a smaller one on the integrator's branch
(`v18/continuation`). They were reconciled into this one the same day; §9 says what was kept from each.

> **NOT CONNECTED.** This demonstration has no Microsoft 365 tenant, no test account and no credential. The calendar is simulated.
> The Microsoft Graph adapter is written to the published contract and exercised only against a deterministic mock. It has never
> been validated against a real calendar, a real Teams client or a real phone. What real validation needs is in
> [M365_DEPLOYMENT_AND_TEST_GUIDE.md](M365_DEPLOYMENT_AND_TEST_GUIDE.md).

Every external fact below was read on the vendor's own page on **2026-11-11**; the page and the date sit beside each one. A fact that
could not be read on an official page is listed as unverified and is not used.

## 1. What was built

| Part | Where | What it is |
|---|---|---|
| People directory | `directory.ts`, `#/people`, `#/people/<id>` | 66 synthetic people derived from the canonical estate: a site champion and a backup for each of the 13 buildings, and a named holder of each operational role (service, svcmgr, syseng, ops, installer, cxeng) for each part of the estate. The service workspace's four technicians are the same four people here |
| Site champion | `directory.ts`, the profile page | A first-class record: the three permissions of the `sitechamp` persona, what the title does **not** grant, the rooms the champion knows (from records), the ordered escalation path, local knowledge, onboarding, availability, and contribution (confirming an entry, adding a local note) |
| App Jump registry | `apps.ts` | One row per way out to another application, with the vendor's template, the page it was read on and the date. Unverified rows are kept on record and never offered |
| Contact actions | `ContactBar.tsx`, `store.ts` | Message in Teams, Send email, Copy email, Copy contact card, Call, Call in Teams, Schedule a meeting, See availability, Open profile, Open location, Find a backup contact. Each says what will happen before it is pressed; afterwards the page says "Opened …", never that anything was sent |
| "Who knows this room?" | `ContactBar.tsx › WhoKnows` | The site champion first when at work (otherwise the backup first, with the reason), then the technician role, the service manager last; the same for a building, a device and an issue. Hosted on the room page, the Lite room, the done step of In this room, a ServiceHands job and Search Party; the room guide (`guides/RoomGuidePage.tsx`) names the champion from the same list |
| Meeting assistant | `calendar.ts`, `MeetPage.tsx` at `#/meet` | Propose → review → explicit confirm. Working hours, shifts, time zones through `Intl` with IANA zones, busy time, the room's bookings. Re-checked at confirm; idempotent on a transaction key; cancellable |
| Calendar adapter | `adapter.ts` (interface and the simulated calendar), `graph.ts` (Microsoft Graph), `graph.mock.ts` (mock transport and fixtures) | One interface, two implementations, one contract suite |

Entity types that carry contact actions in this slice: **person, room, device, building, issue**. NOT BUILT: projects, vendors, work
orders, documents and every other record type; leave and public holidays; presence; photographs.

Addresses: `#/people` (the directory; `?q=` a search, `?about=room:<id>` who to contact about a record, `?room=<id>` the short form
for a room that the Lite room, In this room and the room guide link to, `?site=<building>` the people of one site, which the Site
Champion's `#/site` page links to), `#/people/<id>` (a profile),
`#/meet` (`?with=<ids>&opt=<ids>&room=<id>&about=<kind>:<id>&min=<minutes>&day=<YYYY-MM-DD>&step=who|when|review|done&slot=<instant>&id=<meeting>`).

State: `localStorage['empathia.demo.connect.v1']` (recorded meetings, confirmations of directory entries, local notes) beside the shared
workspace `empathia.demo.workspace.v1` (room bookings and the ledger). `sessionStorage` holds the subject being typed and where the
person was when they left for another app. A stored state that cannot be read starts clean.

## 2. The directory, and what is an assumption

Derived, never typed twice: buildings and rooms from `campus/canon.ts`; operational roles from the access policy (the roles admitted
to the Operations Hub, less the Product Architect); technicians from the service workspace's seed; a champion's permissions from
`packages/domain-data/data/V25_PERSONAS.json` (`sitechamp`: `location.verify`, `access.coordinate`, `occupancy.confirm`, scope `site`).

Stated assumptions of this directory (none comes from a record):

- **Time zones.** The estate records carry no geography, so each part of the estate is given a zone here. They are chosen to meet the
  cases a real estate meets: the United States and the United Kingdom change their clocks on different dates; Phoenix does not change.

  | Part of the estate | IANA zone |
  |---|---|
  | Northstar Innovation Campus | America/Chicago |
  | Science and Learning Park | America/New_York |
  | Forum and Resilience Quarter | Europe/London |
  | Lakeshore Regional Office | America/New_York |
  | Ridgeview Operations Site | America/Phoenix |
  | Millbrook Distribution Centre | America/Los_Angeles |
- **Working hours and shifts.** By kind of work (a champion 07:30–16:00, a backup 10:00–18:30, and so on); service technicians work an
  early (06:00–14:00) or late (13:00–21:00) shift, and the shift is what binds them.
- **Names.** Invented from two lists; "(synthetic)" is said on every page. Addresses are on the reserved domain `empathia.example`;
  telephone numbers are in ranges kept for fiction (555-01xx in North America; 020 7946 0xxx in London).
- **"Last confirmed".** Seeded per person; an entry is "confirmed" for 90 days, counted to the records' date (1 November 2026), "stale"
  after that, "never confirmed" when it has no date.
- **Room familiarity.** From records only: jobs in a room whose access "the site champion" confirmed and reports raised by the site
  champion (the service workspace), then the floor the champion is based on (the floor with the most rooms), then the building. The
  workspace does not say *which* champion, so a job counts for the champion of the room's building.

## 3. Who may (D44)

Every rule is one of V2.5.3's own authorities, read through the policy (`connect/access.ts`): who to contact — entity `SupportPath`;
a person's address and number — field `person.contact`, except that a site champion and their backup are the published contact of a
site and are shown to everyone who may be told who to contact; opening an app for a person — their details and action
`comms.compose`; scheduling — area `scheduler` and action `comms.compose` (in the policy as it stands that is exactly the roles that
may compose: everyone but the Visitor and the Document Reviewer), with people whose details the role may see; browsing the
whole directory — area `search.people`; confirming an entry or adding a note — persona authority `profile.publish` (the Data Steward).

| Role | Told who to contact | Sees a champion's details | Sees a technician's details | Schedules | Browses everyone | Confirms entries, adds notes |
|---|---|---|---|---|---|---|
| AV Operations Lead (`ops`) | yes | yes | yes | yes | yes | — |
| Service Manager (`svcmgr`) | yes | yes | yes | yes | yes | — |
| Service Engineer (`service`) | yes | yes | yes | yes | yes | — |
| Systems Engineer (`syseng`) | yes | yes | yes | yes | yes | — |
| Designer (`designer`) | yes | yes | yes | yes | yes | — |
| Installation Engineer (`installer`) | yes | yes | yes | yes | yes | — |
| Commissioning Engineer (`cxeng`) | yes | yes | yes | yes | yes | — |
| Integration PM (`ipm`) | yes | yes | yes | yes | yes | — |
| Internal PM (`bpm`) | yes | yes | yes | yes | yes | — |
| Data Steward (`steward`) | yes | yes | yes | yes | yes | yes |
| Executive (`exec`) | yes | yes | — | yes | — | — |
| Employee (`employee`) | yes | yes | — | yes | — | — |
| Site Champion (`sitechamp`) | yes | yes | own site only | yes | own site only | own site’s champion entries |
| Visitor (`visitor`) | — | — | — | — | — | — |
| Product Architect (`architect`) | yes | yes | yes | yes | yes | yes |
| Document Reviewer (`qa`) | — | — | — | — | — | — |

A visitor sees no name, address or number. The table is computed from `ROLE_KEYS` as it stands on this branch: sixteen roles since
the merge, the sixteenth being the **Site Champion** (`sitechamp`), still read at run time and never counted by hand.

**The Site Champion.** The policy grants the role the field `person.contact`; Connect narrows it to the champion's own site (the
policy's `CHAMPION_SITES`, today Atlas HQ): a champion sees every site's champion and backup (the published contacts) and the role
holders who cover **their own site** only, reaches and schedules with those people, and may confirm and annotate their own site's
champion entries. Being a champion grants nothing else: the unit suite (CX-19) checks that the policy admits the role to none of the
sign-off, acceptance, authoring, governance or triage actions, and that the people and meeting pages admit nobody who may not even
compose a message; the browser suite (CB-101 to CB-113) checks the same from the page.

## 4. App Jump registry — every link format, its source and the date it was read

"Offered" means only this: the **format** of the link matches the vendor's published documentation on the date given. No link has been
followed against a Microsoft 365 tenant, a Teams client or a telephone.

| Id | Label | Template (as published) | In the interface | Source | Read | Page's own date |
|---|---|---|---|---|---|---|
| `teams.chat` | Message in Teams | `https://teams.microsoft.com/l/chat/0/0?users=<user1>,<user2>,...&topicName=<chat name>&message=<precanned text>` | Offered | https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-teams | 2026-11-11 | 2026-03-26 |
| `teams.call` | Call in Teams | `https://teams.microsoft.com/l/call/0/0?users=<user1>,<user2>` | Offered | https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-workflow | 2026-11-11 | 2026-06-23 |
| `teams.meeting` | Open Teams’ scheduling form | `https://teams.microsoft.com/l/meeting/new?subject=<meeting subject>&startTime=<date>&endTime=<date>&content=<content>&attendees=<user1>,<user2>,<user3>,...` | Offered | https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-workflow | 2026-11-11 | 2026-06-23 |
| `mail.compose` | Send email | `mailto:<addr-spec>?subject=<hfvalue>&body=<hfvalue>` | Offered | https://www.rfc-editor.org/rfc/rfc6068.txt | 2026-11-11 | 2010-10 (RFC 6068) |
| `phone.call` | Call | `tel:<global-number-digits>` | Offered | https://www.rfc-editor.org/rfc/rfc3966 | 2026-11-11 | 2004-12 (RFC 3966) |
| `outlook.web.compose` | Write in Outlook on the web | `https://outlook.office.com/mail/deeplink/compose?to=<address>&subject=<subject>&body=<body>` | **Not offered** (unverified) | — | — | — |
| `teams.protocol` | Open in the Teams app directly | `msteams:/l/chat/0/0?users=<user1>` | **Not offered** (unverified) | — | — | — |

- **`teams.chat` — Message in Teams.** Opens Teams to a chat with the person; then you write and send the message there. Parameters: `users` (required): comma-separated sign-in addresses (Microsoft Entra UserPrincipalName, such as an email address); `topicName`: a name for a chat of three or more people; `message`: text placed in the compose box as a draft. An https address on teams.microsoft.com. The documentation says the chat opens in a draft state: the first message must be sent by the person. If a chat with the same people exists, it opens that chat. *When the app is missing:* The link is itself the web address Microsoft documents (teams.microsoft.com). What a browser shows when the Teams app is not installed has not been observed here. Copy the address and write by email instead.
- **`teams.call` — Call in Teams.** Opens Teams ready to call the person; then Teams asks you to confirm before it places the call. Parameters: `users` (required): comma-separated sign-in addresses (UserPrincipalName), or 4:<phonenumber> for a telephone number; `withVideo`: true to start with the caller’s camera on. An https address on teams.microsoft.com. The documentation says: “Before Teams places the call, the client prompts for a confirmation.” It cannot be used to start a meeting. *When the app is missing:* The link is itself the web address Microsoft documents. What a browser shows without the Teams app has not been observed here. Use the telephone number instead.
- **`teams.meeting` — Open Teams’ scheduling form.** Opens Teams’ own scheduling form with the time, people and subject filled in; then you check it and press Send there; until you do, nobody is invited. Parameters: `subject`: the meeting subject; `startTime`: long ISO 8601 with the UTC offset, for example 2018-03-12T23:55:25+02:00; `endTime`: ISO 8601 with the UTC offset; `content`: the meeting details; `attendees`: comma-separated sign-in addresses (UserPrincipalName). An https address on teams.microsoft.com. The documentation says a location cannot be given, the UTC offset must be given, and spaces must be encoded as %20, never as “+”. *When the app is missing:* The link is itself the web address Microsoft documents. Without Teams, send the invitation from your own calendar using the time shown on the review step.
- **`mail.compose` — Send email.** Opens your email app with a message to the person started; then you finish the message and send it there. Parameters: `to` (required): the address (addr-spec); `subject`: the subject header; `body`: the first lines of the message; line breaks are %0D%0A. Handled by whichever email app the device has set for mailto links. RFC 6068: spaces are %20, a real “+” is %2B, “?”, “=”, “&” and “%” inside a value are percent-encoded, other alphabets are UTF-8 then percent-encoded. *When the app is missing:* If nothing opens, no email app is set up for mailto links on this device: use “Copy email” and paste the address into your mail.
- **`phone.call` — Call.** Opens your phone app with the person’s number entered; then you press call there. Parameters: `number` (required): the number in international form, starting with “+”; hyphens allowed, no spaces. Handled by the device’s telephone app, or by a calling app set for tel links on a computer. RFC 3966: a global number starts with “+”; visual separators are “-”, “.”, “(”, “)”; spaces are not allowed. *When the app is missing:* If nothing opens, this device has no app for telephone links: use “Copy contact card” and dial the number by hand.
- **`outlook.web.compose` — Write in Outlook on the web.** Would open a new message in Outlook on the web; then you would send it there. Parameters: `to` (required): the address. Not offered. *When the app is missing:* Use “Send email” (mailto) or “Copy email”. *Why it is not offered:* Searched on 2026-11-11: this address appears only in community questions and forum threads, not on a Microsoft reference page. Until an official page documents it, it is not offered.
- **`teams.protocol` — Open in the Teams app directly.** Would open the Teams desktop app without passing through the browser; then you would act there. Parameters: `users` (required): sign-in addresses. Not offered. *When the app is missing:* The documented https address is used instead. *Why it is not offered:* The msteams: protocol form is not on either of the two Microsoft pages read on 2026-11-11. The documented https form is used; this one is not offered.

Encoding (unit test CX-09, 400 random inputs with apostrophes, plus signs, ampersands, other alphabets, emoji and line breaks): every
value is percent-encoded down to RFC 3986's unreserved characters, so a space is `%20` and a plus sign `%2B` (Teams' page: "Ensure
your URI encoding code returns %20 for spaces"); line breaks in a mailto body are `%0D%0A` (RFC 6068); a telephone link holds "+",
digits and hyphens only (RFC 3966); an email link is to exactly one address. A link is never built with a missing or unfilled
parameter: the builder refuses instead.

**What ships.** The registry in the page (`apps.ts`) names each source by a short key. The page addresses and the published
templates printed above are held in `apps.sources.ts`, which no page imports: the built site carries no documentation host. The one
external host in the shipped code is the deep link a person chooses to open, `teams.microsoft.com`; nothing is fetched from it, and
the content-security policy does not name it (`tests/security/public-sites.test.mjs` holds both).

**No download address exists anywhere in this slice.** Where an app is missing, the fallback is the web address the same vendor
documents (the Teams links are themselves `https://teams.microsoft.com/…`), or copying the address or number by hand.

**Opening is not completing.** After a jump the interface says "Opened Teams. You write and send the message there. This page only
opened it." The ledger line is `contact.opened`, with the app and the record it was about. Nothing records or claims delivery.
Return context: the jump remembers the page the person was on, and "Back to where I was" is offered when they are somewhere else.

Prefilled words carry the record's name and what the person said they saw. They never carry a note from a job, a local note from a
profile, or anything else read from a record (unit test CX-20 plants a private note and looks for it).

## 5. The meeting assistant

Pure scheduler (`calendar.ts`). A slot is offered only when every person who must attend is inside their working hours (or shift, or
rota) in their own time zone and free, and the room is free. Wall-clock times become instants through `Intl.DateTimeFormat` with IANA
zones; there is no offset arithmetic by hand. Slots that also suit every optional attendee come first, then the earliest; at most
three a day. Each slot carries its reason ("inside everyone's working hours; on Ana Reyes's early shift; Atlas 4.218 free; 30
minutes") and each attendee's own clock.

When no time exists the page says why from the same facts (who has no working time, whose hours never meet, who or what fills the
time they share) and offers only the changes that really produce a time, each re-run with the same scheduler: a shorter meeting, the
following days, without the room, a backup contact in a person's place, a person made optional.

**NOT MODELLED:** public holidays, leave, travel time between buildings, "tentative" as a softer kind of busy.

Booking is a two-step act: **propose → review → explicit confirm.**

1. Proposing, asking Ask Empathia, or arriving from a link records nothing.
2. Review shows who, when in every attendee's zone, where, and the text an invitation would carry.
3. Confirm re-reads the calendar and the workspace from storage at that moment. If anything changed, it refuses, names who or what
   conflicts, writes `meeting.refused` to the ledger and offers the times that work now. While a review is open the page also
   listens for changes from other tabs: when the time is taken the review is **withdrawn** (Confirm is removed, and the page says
   who or what is in the way) without waiting for a press.
4. The confirmation carries a transaction key derived from the request and the slot. The same key always yields the same one meeting:
   a double press, a reload and resubmit, and a second tab all end with one meeting and one ledger line. A review of a request that
   is already recorded offers no Confirm: it says so and links to the meeting.
5. The result reads exactly: **"Recorded in this demonstration's simulated calendar. No invitation left this browser."**
6. The room's booking is written to the shared workspace (`w.bookings[roomId]`), where ServiceHands' preflight and the Operations Hub
   read it. Cancelling (the role that recorded it, or the Product Architect) removes the booking, keeps the meeting as cancelled,
   and is logged. A meeting with no room is marked online; through the Graph adapter that is `isOnlineMeeting: true` with
   `onlineMeetingProvider: "teamsForBusiness"` (mock-tested).
7. After recording, "Open Teams' scheduling form with this filled in" is offered (`teams.meeting`): it opens Teams' own form; nobody
   is invited until the person presses Send there. This is how a real invitation would be sent from this page today: by the person.

Ask Empathia: "who do I contact about <room>?" is answered from the directory; "book 30 minutes with the systems engineer about
<room>" resolves the person and the first slot and ends with a link to the review step. Asking never books, and does not change who
may: a role that may not schedule, or may not see that person's calendar, is told so and nothing is looked up.

## 6. One adapter interface, two implementations

`CalendarAdapter` (`adapter.ts`): `people(query)`, `schedule(addresses, from, to)`, `shifts(from, to)`, `suggest(request)`,
`create(request with a client-supplied transactionId)`, `cancel(eventId, comment)`. Every answer carries its provenance.

| Implementation | Provenance | Used by | Validated against |
|---|---|---|---|
| `simulatedAdapter` | SIMULATED | The demonstration (every page) | Unit and browser suites |
| `graphAdapter` | MOCK-TESTED | Nothing in the demonstration: no page imports it | The contract suite, through the mock transport only. **NOT validated against a real tenant** |

`connected()` returns `[]`. `graph.ts` contains no network call: every request goes through a `Transport` the caller supplies, and the
only transport that exists is `graph.mock.ts`.

### Microsoft Graph calls a connected adapter uses (v1.0)

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

How throttling and errors are answered:

- **throttling** — HTTP 429 with a Retry-After header: wait that many seconds, retry the request; without the header, back off exponentially. Source: https://learn.microsoft.com/graph/throttling (page updated 2025-01-15; read 2026-11-11).
- **errors** — 401: authentication missing or not valid. 403: the user does not have enough permission or a required licence. The body is { error: { code, message, innerError } }; the message is not shown to people. Source: https://learn.microsoft.com/en-us/graph/errors (page updated 2025-08-06; read 2026-11-11).

Design decisions that follow from those pages:

- **Times go out in UTC** (`timeZone: "UTC"`, `Prefer: outlook.timezone="UTC"`), so no zone name is translated on the way out. Working
  hours come back with a Windows zone name in the documented example; the adapter maps the names below and treats any other as
  **unknown: no time is proposed on a guess** (unit test CX-28).

  | Windows name | IANA zone |
  |---|---|
  | UTC | UTC |
  | Pacific Standard Time | America/Los_Angeles |
  | Central Standard Time | America/Chicago |
  | Eastern Standard Time | America/New_York |
  | US Mountain Standard Time | America/Phoenix |
  | GMT Standard Time | Europe/London |

  Only "Pacific Standard Time" appears on the pages read on 2026-11-11; the other names follow the same Windows naming and are **not
  validated against a tenant**.
- **Suggestions are computed by the same scheduler as the simulation**, from `getSchedule` and Shifts, because `findMeetingTimes` does
  not support application permissions, knows nothing about Shifts and, by its own page, is fine-tuned periodically. `findMeetingTimes`
  is implemented as `native()` for a cross-check with a signed-in user.
- **Creating the event is what sends invitations** ("When an event is sent, the server sends invitations to all the attendees"), so
  `create` is reached only from an explicit confirmation, re-checks free/busy first, and always carries `transactionId`. Graph does not
  refuse an overlapping event; the refusal is the adapter's.
- **401/403** → "Not authorised; ask your administrator for <permission> (<delegated|application> permission, Microsoft Graph)". The
  server's own message is not shown to people (the errors page says it should not be).
- **429** → wait the `Retry-After` seconds, retry the same request with the same transaction id; without the header, back off
  exponentially; give up after five attempts saying nothing was created.

### What the mock assumes beyond the documentation

The pages read on 2026-11-11 do not say everything. Each of these is the mock's behaviour, not a documented fact, and is a step of
the real validation script:

- A second POST /events with a transactionId already used returns the first event and creates nothing (the property’s stated purpose; the response itself is not documented on the pages read).
- Creating an event that overlaps another is accepted (Graph has no documented refusal); the adapter, not the server, refuses a conflict.
- A request without a bearer token is answered 401; a caller without the permission is answered 403; the error code strings are illustrative.
- A throttled request has not been processed.
- Working hours come back with a Windows time-zone name for each of the directory’s zones.

### Fixtures

Examples copied from the documentation, each with its page; the mock answers in these shapes.

| Fixture | Status | What it is | Source | Read |
|---|---|---|---|---|
| `getSchedule` | 200 | the first schedule of the page’s example response (requested with Prefer: outlook.timezone="Pacific Standard Time") | https://learn.microsoft.com/en-us/graph/api/calendar-getschedule | 2026-11-11 |
| `findMeetingTimes` | 200 | the first of the five suggestions in the page’s example response | https://learn.microsoft.com/graph/api/user-findmeetingtimes | 2026-11-11 |
| `createEventRequest` | 201 | the request body of the page’s Example 1, which sets transactionId | https://learn.microsoft.com/en-us/graph/api/user-post-events | 2026-11-11 |
| `cancelEvent` | 202 | the page’s response: 202 Accepted and no body | https://learn.microsoft.com/en-us/graph/api/event-cancel | 2026-11-11 |
| `shifts` | 200 | the page’s example response (the beta-version page; the v1.0 shift resource lists the same List method), draftShift left out | https://learn.microsoft.com/cs-cz/graph/api/schedule-list-shifts?view=graph-rest-beta | 2026-11-11 |
| `throttled` | 429 | the page’s example 429 response | https://learn.microsoft.com/graph/throttling | 2026-11-11 |
| `error` | 400 | the page’s example of a full JSON error body; the mock reuses its shape for 401 and 403 with a status-appropriate code, which is illustrative (the adapter reads only the HTTP status) | https://learn.microsoft.com/en-us/graph/errors | 2026-11-11 |
| `users` | 200 | the default properties the page lists for a user, as one user (values invented in the reserved example domain; the page’s own example values were not copied) | https://learn.microsoft.com/graph/api/user-list | 2026-11-11 |

### Not read, and therefore not used

- Places / room lists (`/places`), the `dateTimeTimeZone` and `attendee` resource pages, Teams presence, the `onlineMeetings` API
  (the two online-meeting properties of an event are on the event resource page, which was read), and the permissions reference
  beyond the seven permissions this slice names. A room is addressed by its mailbox in `schedules` and as an attendee of type `resource`, both of which are
  on the pages read.
- The limit on the number of addresses in one `getSchedule` call: the page states none; the adapter does not chunk.

## 7. Tests

`tests/unit/demo-connect.test.mjs` (33 tests, CX-01 to CX-32) and `tests/browser/demo-connect.test.mjs`. The unit suite recomputes every claim from
the records with its own clock arithmetic: the directory against the estate and the policy; every link decoded again; 3,000 random
scheduling requests checked slot by slot (and one in six by brute force for completeness); idempotent confirmation; injected conflicts
always refused; random sequences of confirm, double-confirm, collide and cancel with the invariants checked after every step; the role
matrix over `ROLE_KEYS`; and **one contract suite run against both adapters** (CX-24), then Graph-only tests for the request shapes,
the documented example responses, permissions and consent errors, throttling, a lost answer and time zones. CX-32 (the property the
integrator's suite carried) checks that a person's simulated busy time is the same whatever window is asked; it found and fixed a
case where two touching blocks came back as one or two depending on the window. CX-31 checks that this
document and the guide name every call, permission and source in the registries, so they cannot drift apart.

## 8. Pending — not done, and not claimed

| | State |
|---|---|
| Real tenant validation | **Pending.** No tenant exists for this project |
| Actual event creation | **Pending.** No event has ever been created in a real calendar |
| Live Teams interactions | **Pending.** No Teams link has been followed in a real Teams client |
| Physical mobile QA | **Pending.** No link has been followed on an Android phone or an iPhone, with or without the apps installed |
| Site Champion role in the policy | Present since the merge (role key `sitechamp`); this slice reads it at run time |
| Outlook on the web compose link | Unverified; not offered |
| Entity types beyond person, room, device, building, issue | Not built |
| Public holidays and leave | Not modelled |

## 9. One Connect: what was kept from each side (11 November 2026)

The integrator's branch `v18/continuation` carried a second, smaller Connect (a directory, a link registry, a scheduler, a store, a
Graph adapter and `connect/ui.tsx`) with a unit suite CN-01 to CN-14. It was merged into this branch and reconciled to ONE.

**Kept from this branch (the base):** `connect/{time,calendar,directory,apps,adapter,graph,graph.mock,access,store}.ts`,
`ContactBar.tsx`, `PeoplePage.tsx`, `MeetPage.tsx`, `search.tsx`, `ask.tsx`, `jumps.ts`, `registry.connect.ts`, both test suites and
both documents. There is one directory, one scheduler, one store, one `#/people` and one `#/meet`.

**Removed:** the integrator's `connect/ui.tsx` (`ContactBar` and `WhoKnows` do that job).

**Adopted from the integrator's side:**

- the sixteenth role `sitechamp` and `CHAMPION_SITES`, from the policy; the champion's `#/site` page and its link `#/people?site=`;
- `#/people?room=`, the address the Lite room (`lite-who`), In this room (`here-who`) and the room guide (`guide-who`) link to — one
  link each, beside this slice's "Who knows this room?" block;
- the service manager last in a room's contacts; the backup first whenever the champion is not at work;
- a review withdrawn when another tab takes the time; an email to exactly one address; the Product Architect may cancel;
- `isOnlineMeeting` / `teamsForBusiness` on a meeting with no room; Graph parsers that drop malformed entries instead of throwing;
- the six-column status table, the twelve-step script, accounts A to E and the SharePoint row of the M365 guide.

**Each CN property, asserted against the surviving code** (`tests/unit/demo-connect.test.mjs`):

| Integrator's test | Property | Asserted here by |
|---|---|---|
| CN-01 | The directory is derived and wholly synthetic | CX-01, CX-02, CX-03 |
| CN-02 | Who knows each of the 90 rooms, in order, with a reason | CX-06 |
| CN-03 | Time zones from the platform's own data | CX-10 |
| CN-04 | The link registry: formats, encoding, the unverified never built | CX-08, CX-09 |
| CN-05 | The scheduler never breaks hours, shifts or busy time; the simulated calendar does not depend on the window asked | CX-11, CX-32 |
| CN-06 | Across regions, and "no time" said with the reason | CX-12 |
| CN-07 | Confirm once; the room is then taken | CX-13, CX-14 |
| CN-08 | A time taken in between is refused | CX-15 |
| CN-09 | The role matrix over all sixteen roles | CX-19 |
| CN-10 | Cancel frees the people and the room; unreadable state starts clean | CX-17, CX-18 |
| CN-11 | Graph requests as documented | CX-26 |
| CN-12 | Graph responses read; malformed entries dropped, never thrown on | CX-27 |
| CN-13 | Graph errors, throttling, one event | CX-29, CX-30 |
| CN-14 | One scheduler behind either adapter | CX-24, CX-25 |

**Where the surviving code differs from the integrator's on purpose:** line breaks in a `mailto:` body are `%0D%0A` (RFC 6068), where
the integrator's sent `%0A`; a telephone link keeps its hyphens (RFC 3966 allows them as visual separators); a Site Champion sees
the role holders of their own site only, which is narrower than the integrator's `maySeeContact` (founder: scoped access); the
application permission for `getSchedule` is recorded as `Calendars.ReadBasic.All` (the permissions reference) where both earlier
versions had `Calendars.ReadBasic` (the call's own page).
