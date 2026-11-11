/**
 * The Microsoft Graph implementation of the calendar adapter (adapter.ts › CalendarAdapter).
 *
 * STATUS: MOCK-TESTED. Written to the request and response shapes published on learn.microsoft.com, each read on 2026-11-11
 * (GRAPH_CALLS carries the page and the date for every call). It has never been run against a Microsoft 365 tenant: there is no
 * tenant, no test account and no credential in this demonstration. No page of the demonstration imports this file, and this file
 * contains no network call of its own: every request goes through a `Transport` the caller supplies, and the only transport that
 * exists is the deterministic mock in graph.mock.ts. What real validation needs is in docs/surpass/M365_DEPLOYMENT_AND_TEST_GUIDE.md.
 *
 * Decisions, and why:
 *   - Times are sent in UTC (`timeZone: "UTC"`, `Prefer: outlook.timezone="UTC"`), so no zone name is translated on the way out.
 *     Working hours come back with a Windows zone name in the documented example; a name this file cannot map is reported as
 *     "working hours unknown" and the meeting is not proposed, rather than guessed.
 *   - Suggestions are computed by the same scheduler as the simulation (calendar.ts) from getSchedule and Shifts, because
 *     findMeetingTimes does not support application permissions, does not know Shifts, and by its own page "is fine-tuned
 *     periodically". findMeetingTimes is available as `native()` for a cross-check with a signed-in user.
 *   - Creating an event is the act that makes the server send invitations ("When an event is sent, the server sends invitations to
 *     all the attendees"). `create` is therefore called only after a person's explicit confirmation, re-checks free/busy first, and
 *     always carries a client-supplied `transactionId`. Graph does not refuse an overlapping event: the re-check is this adapter's.
 *   - 401/403 name the permission to ask an administrator for. 429 waits the `Retry-After` seconds and retries the SAME request,
 *     same transaction id, so a retry can never make a second event.
 */
import { conflictsAt, propose, type Ask, type Busy, type Cal, type Hours, type Slot } from './calendar.js';
import type { CalendarAdapter, CalEvent, Created, CreateRequest, FailKind, Party, PersonRef, Provenance, Result, RoomRef, ScheduleOf, ShiftOf, SuggestRequest, WorkingHours } from './adapter.js';
import { DAY, MIN, isHm, isZone, overlaps, wallToUtc } from './time.js';

export interface HttpRequest { method: 'GET' | 'POST' | 'DELETE'; url: string; headers: Record<string, string>; body?: unknown }
export interface HttpResponse { status: number; headers: Record<string, string>; body: unknown }
export type Transport = (req: HttpRequest) => Promise<HttpResponse>;
export const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
export const GRAPH_VALIDATED = '2026-11-11';

export interface GraphCall {
  id: 'people' | 'schedule' | 'suggest' | 'create' | 'cancel' | 'shifts';
  what: string; method: 'GET' | 'POST';
  /** the request line for a signed-in user (delegated), and for an app acting without one (application); null where the page says "Not supported" */
  delegatedPath: string | null; applicationPath: string | null;
  /** least-privileged permission of each kind, as the page lists it; null where not supported */
  delegated: string | null; application: string | null; higher: string[];
  success: number;
  source: string; pageUpdated: string | null; validated: string;
  notes: string[];
}
export const GRAPH_CALLS: readonly GraphCall[] = [
  { id: 'people', what: 'Find a person by name (people lookup)', method: 'GET', delegatedPath: '/users', applicationPath: '/users', delegated: 'User.ReadBasic.All', application: 'User.Read.All', higher: ['User.Read.All', 'User.ReadWrite.All', 'Directory.Read.All', 'Directory.ReadWrite.All'], success: 200,
    source: 'https://learn.microsoft.com/graph/api/user-list', pageUpdated: '2025-07-23', validated: GRAPH_VALIDATED,
    notes: ['$search="displayName:…" needs the header ConsistencyLevel: eventual and $count=true', 'Personal Microsoft accounts are not supported'] },
  { id: 'schedule', what: 'Free/busy and working hours of people and rooms (schedule lookup)', method: 'POST', delegatedPath: '/me/calendar/getSchedule', applicationPath: '/users/{id|userPrincipalName}/calendar/getSchedule', delegated: 'Calendars.ReadBasic', application: 'Calendars.ReadBasic', higher: ['Calendars.Read', 'Calendars.ReadWrite'], success: 200,
    source: 'https://learn.microsoft.com/en-us/graph/api/calendar-getschedule', pageUpdated: '2025-07-23', validated: GRAPH_VALIDATED,
    notes: ['availabilityViewInterval: default 30 minutes, minimum 5, maximum 1440', 'Without Prefer: outlook.timezone the times come back in UTC', 'A slot holding more than 1000 entries is answered with error 5006', 'The page states no limit on the number of addresses: not chunked here; to observe in real validation'] },
  { id: 'suggest', what: 'Meeting-time suggestions (findMeetingTimes): a cross-check, not the primary path', method: 'POST', delegatedPath: '/me/findMeetingTimes', applicationPath: null, delegated: 'Calendars.Read.Shared', application: null, higher: ['Calendars.ReadWrite.Shared'], success: 200,
    source: 'https://learn.microsoft.com/graph/api/user-findmeetingtimes', pageUpdated: '2024-04-04', validated: GRAPH_VALIDATED,
    notes: ['Application permissions and personal accounts: Not supported', 'Works inside the mailbox’s work hours unless activityDomain says otherwise; knows nothing about Shifts', 'meetingDuration is ISO 8601 (PT30M); the default is 30 minutes'] },
  { id: 'create', what: 'Create the event (this is what sends invitations)', method: 'POST', delegatedPath: '/me/events', applicationPath: '/users/{id | userPrincipalName}/events', delegated: 'Calendars.ReadWrite', application: 'Calendars.ReadWrite', higher: [], success: 201,
    source: 'https://learn.microsoft.com/en-us/graph/api/user-post-events', pageUpdated: null, validated: GRAPH_VALIDATED,
    notes: ['transactionId: “A custom identifier specified by a client app for the server to avoid redundant POST operations in case of client retries to create the same event” (https://learn.microsoft.com/en-us/graph/api/resources/event)', 'A room is invited as an attendee of type resource, with its mailbox address', 'NOT STATED on the pages read: what the server answers to a second POST with the same transactionId. The mock assumes the first event is returned; to observe in real validation'] },
  { id: 'cancel', what: 'Cancel the event (the organiser only; sends a cancellation)', method: 'POST', delegatedPath: '/me/events/{id}/cancel', applicationPath: '/users/{id | userPrincipalName}/events/{id}/cancel', delegated: 'Calendars.ReadWrite', application: 'Calendars.ReadWrite', higher: [], success: 202,
    source: 'https://learn.microsoft.com/en-us/graph/api/event-cancel', pageUpdated: '2024-06-21', validated: GRAPH_VALIDATED,
    notes: ['An attendee who calls it gets HTTP 400: “You need to be an organizer to cancel a meeting.”', 'Returns 202 Accepted and no body'] },
  { id: 'shifts', what: 'Shifts of a Teams team (who is on shift when)', method: 'GET', delegatedPath: '/teams/{teamId}/schedule/shifts', applicationPath: '/teams/{teamId}/schedule/shifts', delegated: 'Schedule.Read.All', application: 'Schedule.Read.All', higher: ['Schedule.ReadWrite.All', 'Group.Read.All', 'Group.ReadWrite.All'], success: 200,
    source: 'https://learn.microsoft.com/en-us/graph/api/resources/shift', pageUpdated: '2025-02-04', validated: GRAPH_VALIDATED,
    notes: ['The v1.0 shift resource page lists the List method; its request line and example were read on the beta-version page of the same article (https://learn.microsoft.com/cs-cz/graph/api/schedule-list-shifts?view=graph-rest-beta, updated 2025-07-23). The v1.0 List page itself was not read', '$filter may name a property once: sharedShift/startDateTime ge … and sharedShift/endDateTime le …', 'A shift is at most 24 hours; a shift identifies its person by userId (the directory object id)'] },
];
export const graphCall = (id: GraphCall['id']): GraphCall => GRAPH_CALLS.find((c) => c.id === id)!;
/** Pages read on 2026-11-11 that are not one call: how throttling and errors are answered. */
export const GRAPH_GUIDANCE = {
  throttling: { source: 'https://learn.microsoft.com/graph/throttling', pageUpdated: '2025-01-15', validated: GRAPH_VALIDATED, rule: 'HTTP 429 with a Retry-After header: wait that many seconds, retry the request; without the header, back off exponentially' },
  errors: { source: 'https://learn.microsoft.com/en-us/graph/errors', pageUpdated: '2025-08-06', validated: GRAPH_VALIDATED, rule: '401: authentication missing or not valid. 403: the user does not have enough permission or a required licence. The body is { error: { code, message, innerError } }; the message is not shown to people' },
} as const;

/**
 * Windows zone names Graph uses in the documented examples, for the zones this directory has. "Pacific Standard Time" is the name in
 * the pages read on 2026-11-11; the others follow the same Windows naming and are NOT validated against a tenant. A name not here
 * (and not an IANA name the platform knows) is treated as unknown.
 */
export const WINDOWS_ZONE: Readonly<Record<string, string>> = { UTC: 'UTC', 'Pacific Standard Time': 'America/Los_Angeles', 'Central Standard Time': 'America/Chicago', 'Eastern Standard Time': 'America/New_York', 'US Mountain Standard Time': 'America/Phoenix', 'GMT Standard Time': 'Europe/London' };
export const toIana = (name: unknown): string | null => (typeof name !== 'string' ? null : WINDOWS_ZONE[name] || (name.includes('/') && isZone(name) ? name : null));
export const toWindows = (tz: string): string | null => Object.entries(WINDOWS_ZONE).find(([, v]) => v === tz)?.[0] || null;

const two = (n: number) => String(n).padStart(2, '0');
/** An instant as Graph's dateTimeTimeZone in UTC. */
export const toGraphTime = (ms: number): { dateTime: string; timeZone: 'UTC' } => { const d = new Date(ms); return { dateTime: `${d.getUTCFullYear()}-${two(d.getUTCMonth() + 1)}-${two(d.getUTCDate())}T${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())}`, timeZone: 'UTC' }; };
/** Graph's dateTimeTimeZone as an instant; null when the zone name cannot be read (never guessed). */
export function fromGraphTime(x: unknown): number | null {
  const o = x as { dateTime?: unknown; timeZone?: unknown } | null; const m = typeof o?.dateTime === 'string' ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(o.dateTime) : null; const tz = toIana(o?.timeZone);
  if (!m || !tz) return null;
  return wallToUtc(tz, Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])) + Number(m[6] || 0) * 1000;
}
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const htmlOf = (text: string) => esc(text).replace(/\r?\n/g, '<br>');
const header = (h: Record<string, string>, name: string): string | null => { const k = Object.keys(h).find((x) => x.toLowerCase() === name.toLowerCase()); return k ? h[k]! : null; };

// ------------------------------------------------------------------------------------------------------------ the requests, exactly
export interface GraphMode { mode: 'delegated' | 'application'; /** the organiser's sign-in address: the mailbox an application acts on */ organizer: string }
const mailbox = (m: GraphMode) => (m.mode === 'delegated' ? '/me' : `/users/${encodeURIComponent(m.organizer)}`);
const JSON_HEADERS = { 'Content-Type': 'application/json', Prefer: 'outlook.timezone="UTC"' };
export const reqPeople = (query: string): HttpRequest => ({ method: 'GET', url: `${GRAPH_BASE}/users?$search=${encodeURIComponent(`"displayName:${query.replace(/["\\]/g, ' ').trim().slice(0, 60)}"`)}&$select=id,displayName,mail,userPrincipalName,jobTitle,businessPhones&$orderby=displayName&$top=10&$count=true`, headers: { ConsistencyLevel: 'eventual' } });
export const reqSchedule = (m: GraphMode, mails: string[], from: number, to: number): HttpRequest => ({ method: 'POST', url: `${GRAPH_BASE}${mailbox(m)}/calendar/getSchedule`, headers: { ...JSON_HEADERS }, body: { schedules: mails, startTime: toGraphTime(from), endTime: toGraphTime(to), availabilityViewInterval: 30 } });
export const reqShifts = (teamId: string, from: number, to: number): HttpRequest => ({ method: 'GET', url: `${GRAPH_BASE}/teams/${encodeURIComponent(teamId)}/schedule/shifts?$filter=${encodeURIComponent(`sharedShift/startDateTime ge ${new Date(from).toISOString()} and sharedShift/endDateTime le ${new Date(to).toISOString()}`)}`, headers: {} });
const attendeeOf = (p: Party) => ({ emailAddress: { address: p.mail, name: p.name }, type: p.optional ? 'optional' : 'required' });
const resourceOf = (r: RoomRef) => ({ emailAddress: { address: r.mail, name: r.name }, type: 'resource' });
export const reqFindMeetingTimes = (req: SuggestRequest, organizerMail: string): HttpRequest => ({ method: 'POST', url: `${GRAPH_BASE}/me/findMeetingTimes`, headers: { ...JSON_HEADERS },
  body: { attendees: [...req.parties.filter((p) => p.mail !== organizerMail).map((p) => ({ type: 'required', emailAddress: { name: p.name, address: p.mail } })), ...(req.room ? [{ type: 'resource', emailAddress: { name: req.room.name, address: req.room.mail } }] : [])],
    timeConstraint: { activityDomain: 'work', timeSlots: [{ start: toGraphTime(req.from), end: toGraphTime(req.to) }] }, meetingDuration: `PT${req.minutes}M`, maxCandidates: req.max ?? 6, isOrganizerOptional: false, returnSuggestionReasons: true, minimumAttendeePercentage: 100 } });
export const reqCreate = (m: GraphMode, req: CreateRequest): HttpRequest => ({ method: 'POST', url: `${GRAPH_BASE}${mailbox(m)}/events`, headers: { ...JSON_HEADERS },
  body: { subject: req.subject, body: { contentType: 'HTML', content: htmlOf(req.body) }, start: toGraphTime(req.from), end: toGraphTime(req.to),
    ...(req.room ? { location: { displayName: req.room.name, locationEmailAddress: req.room.mail } } : {}),
    attendees: [...req.parties.filter((p) => p.mail !== m.organizer).map(attendeeOf), ...(req.room ? [resourceOf(req.room)] : [])], transactionId: req.transactionId } });
export const reqCancel = (m: GraphMode, eventId: string, comment: string): HttpRequest => ({ method: 'POST', url: `${GRAPH_BASE}${mailbox(m)}/events/${encodeURIComponent(eventId)}/cancel`, headers: { 'Content-Type': 'application/json' }, body: { comment: comment.slice(0, 300) } });

// ------------------------------------------------------------------------------------------------------------ the responses, as documented
/** getSchedule's `value`: one scheduleInformation per address. "free" and "workingElsewhere" are not busy; "tentative", "busy" and "oof" are. */
export function parseSchedule(body: unknown): ScheduleOf[] {
  const list = (body as { value?: unknown[] } | null)?.value; if (!Array.isArray(list)) return [];
  return list.map((raw) => {
    const s = raw as { scheduleId?: string; scheduleItems?: Array<{ status?: string; start?: unknown; end?: unknown; subject?: string }>; workingHours?: { daysOfWeek?: string[]; startTime?: string; endTime?: string; timeZone?: { name?: string } }; error?: { message?: string } };
    const busy: Busy[] = []; let unread = 0;
    for (const it of s.scheduleItems || []) { if (!['busy', 'oof', 'tentative'].includes(it.status || '')) continue; const a = fromGraphTime(it.start); const b = fromGraphTime(it.end); if (a == null || b == null) { unread += 1; continue; } busy.push({ from: a, to: b, title: it.status === 'busy' ? 'Busy' : it.status === 'oof' ? 'Out of office' : 'Tentative' }); }
    const wh = s.workingHours; const tz = toIana(wh?.timeZone?.name); const start = (wh?.startTime || '').slice(0, 5); const end = (wh?.endTime || '').slice(0, 5);
    const days = (wh?.daysOfWeek || []).map((d) => DAYS.indexOf(String(d).toLowerCase())).filter((n) => n >= 0);
    const working: WorkingHours | null = wh && tz && isHm(start) && isHm(end) && days.length ? { days, start, end, tz } : null;
    const note = s.error?.message ? `the calendar answered with an error for this address: ${s.error.message}` : unread ? `${unread} busy block(s) came back in a time zone this adapter cannot read` : !wh ? undefined : !working ? `working hours came back in a time zone this adapter cannot read (“${wh.timeZone?.name || 'none'}”)` : undefined;
    return { mail: String(s.scheduleId || ''), busy: busy.sort((x, y) => x.from - y.from), working, ...(note ? { note } : {}) };
  });
}
export function parsePeople(body: unknown): PersonRef[] {
  const list = (body as { value?: unknown[] } | null)?.value; if (!Array.isArray(list)) return [];
  return list.map((raw) => { const u = raw as { id?: string; displayName?: string; mail?: string | null; userPrincipalName?: string; jobTitle?: string | null; businessPhones?: string[] }; return { id: String(u.id || ''), name: String(u.displayName || ''), mail: String(u.mail || u.userPrincipalName || '').toLowerCase(), title: u.jobTitle || null, phone: u.businessPhones?.[0] || null }; }).filter((p) => p.id && p.mail);
}
/** The shared (published) version of each shift; a shift that exists only as a manager's draft is not a fact yet and is left out. */
export function parseShifts(body: unknown): ShiftOf[] {
  const list = (body as { value?: unknown[] } | null)?.value; if (!Array.isArray(list)) return [];
  const out: ShiftOf[] = [];
  for (const raw of list) { const s = raw as { userId?: string; sharedShift?: { startDateTime?: string; endDateTime?: string; displayName?: string | null } | null }; const a = Date.parse(s.sharedShift?.startDateTime || ''); const b = Date.parse(s.sharedShift?.endDateTime || ''); if (s.userId && Number.isFinite(a) && Number.isFinite(b) && b > a) out.push({ personId: s.userId, from: a, to: b, name: s.sharedShift?.displayName || 'Shift' }); }
  return out.sort((x, y) => x.from - y.from || x.personId.localeCompare(y.personId));
}
export interface NativeSuggestion { from: number; to: number; confidence: number; reason: string; organizer: string; attendees: Array<{ mail: string; availability: string }> }
export function parseFindMeetingTimes(body: unknown): { suggestions: NativeSuggestion[]; empty: string } {
  const b = body as { emptySuggestionsReason?: string; meetingTimeSuggestions?: unknown[] } | null; const out: NativeSuggestion[] = [];
  for (const raw of b?.meetingTimeSuggestions || []) { const s = raw as { confidence?: number; suggestionReason?: string; organizerAvailability?: string; attendeeAvailability?: Array<{ availability?: string; attendee?: { emailAddress?: { address?: string } } }>; meetingTimeSlot?: { start?: unknown; end?: unknown } }; const a = fromGraphTime(s.meetingTimeSlot?.start); const z = fromGraphTime(s.meetingTimeSlot?.end); if (a != null && z != null) out.push({ from: a, to: z, confidence: Number(s.confidence ?? 0), reason: String(s.suggestionReason || ''), organizer: String(s.organizerAvailability || ''), attendees: (s.attendeeAvailability || []).map((x) => ({ mail: String(x.attendee?.emailAddress?.address || ''), availability: String(x.availability || '') })) }); }
  return { suggestions: out, empty: String(b?.emptySuggestionsReason || '') };
}
export function parseEvent(body: unknown, req: CreateRequest): CalEvent | null {
  const e = body as { id?: string; transactionId?: string; createdDateTime?: string; isCancelled?: boolean } | null; if (!e?.id) return null;
  return { id: e.id, transactionId: e.transactionId || req.transactionId, subject: req.subject, body: req.body, from: req.from, to: req.to, parties: req.parties, room: req.room, state: e.isCancelled ? 'CANCELLED' : 'RECORDED', createdAt: e.createdDateTime || '' };
}

// ------------------------------------------------------------------------------------------------------------ the adapter
export interface GraphConfig extends GraphMode {
  transport: Transport; token: () => Promise<string>;
  /** the Teams team whose Shifts are the rota; without one, shifts are not read and shift workers are scheduled by their mailbox hours */
  teamId?: string | null;
  /** how to wait between retries (injected so tests wait no real time) and how many times to retry a throttled or dropped request */
  sleep?: (ms: number) => Promise<void>; maxRetries?: number; now?: () => number;
  /** the caller's own record of a transaction id it has already seen through (the store keeps one), so a reload never creates again */
  known?: (transactionId: string) => CalEvent | null;
}
const P: Provenance = 'MOCK-TESTED';
const fail = <T,>(kind: FailKind, why: string[], extra: Partial<Extract<Result<T>, { ok: false }>> = {}): Result<T> => ({ ok: false, kind, why, provenance: P, ...extra });

export interface GraphAdapter extends CalendarAdapter { native(req: SuggestRequest): Promise<Result<NativeSuggestion[]>>; /** every request this adapter has built, in order, without the token */ sent: HttpRequest[]; waits: number[] }
export function graphAdapter(cfg: GraphConfig): GraphAdapter {
  const sleep = cfg.sleep || ((ms: number) => new Promise<void>((r) => setTimeout(r, ms))); const max = cfg.maxRetries ?? 4; const now = cfg.now || (() => Date.now());
  const sent: HttpRequest[] = []; const waits: number[] = []; const done = new Map<string, CalEvent>(); const kind = cfg.mode;
  const needs = (c: GraphCall) => (kind === 'delegated' ? c.delegated : c.application);
  /** Send one request, waiting and retrying when Graph throttles (429 + Retry-After) or the request is dropped; a retry is byte-for-byte the same request. */
  async function send<T>(call: GraphCall, req: HttpRequest, retryDropped: boolean): Promise<{ ok: true; res: HttpResponse } | { ok: false; out: Result<T> }> {
    const perm = needs(call); if (!perm) return { ok: false, out: fail('unavailable', [`${call.what}: Microsoft Graph does not support ${kind} permissions for this call.`]) };
    sent.push(req);
    for (let attempt = 0; ; attempt += 1) {
      let res: HttpResponse;
      try { const token = await cfg.token(); res = await cfg.transport({ ...req, headers: { ...req.headers, Authorization: `Bearer ${token}` } }); }
      catch { if (retryDropped && attempt < max) { const ms = 1000 * 2 ** attempt; waits.push(ms); await sleep(ms); continue; } return { ok: false, out: fail('unavailable', ['The calendar could not be reached. Nothing was changed that this app knows of; try again.']) }; }
      if (res.status === 429 || res.status === 503) {
        if (attempt >= max) return { ok: false, out: fail('throttled', [`The calendar asked this app to slow down ${attempt + 1} times in a row. Nothing was created; try again in a few minutes.`]) };
        const ra = Number(header(res.headers, 'Retry-After')); const ms = Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1000 * 2 ** attempt; waits.push(ms); await sleep(ms); continue;
      }
      if (res.status === 401) return { ok: false, out: fail('not-authorised', [`Not authorised: the sign-in is missing or has expired. Sign in again; if it still fails, ask your administrator for ${perm} (${kind} permission, Microsoft Graph).`]) };
      if (res.status === 403) return { ok: false, out: fail('not-authorised', [`Not authorised; ask your administrator for ${perm} (${kind} permission, Microsoft Graph) so that this app may ${call.what.split(' (')[0]!.toLowerCase()}.`]) };
      return { ok: true, res };
    }
  }
  const ok = <T,>(value: T): Result<T> => ({ ok: true, value, provenance: P });

  async function schedule(mails: string[], from: number, to: number): Promise<Result<ScheduleOf[]>> {
    const r = await send<ScheduleOf[]>(graphCall('schedule'), reqSchedule(cfg, mails, from, to), true); if (!r.ok) return r.out;
    if (r.res.status !== 200) return fail('unavailable', [`The calendar answered ${r.res.status} to the schedule lookup.`]);
    const got = parseSchedule(r.res.body); return ok(mails.map((m) => got.find((x) => x.mail.toLowerCase() === m.toLowerCase()) || { mail: m, busy: [], working: null, note: 'the calendar returned nothing for this address' }));
  }
  async function shifts(from: number, to: number): Promise<Result<ShiftOf[]>> {
    if (!cfg.teamId) return fail('unavailable', ['No Teams team is configured for Shifts, so shifts are not read.']);
    const r = await send<ShiftOf[]>(graphCall('shifts'), reqShifts(cfg.teamId, from - DAY, to + DAY), true); if (!r.ok) return r.out;
    if (r.res.status !== 200) return fail('unavailable', [`The calendar answered ${r.res.status} to the shifts request.`]);
    return ok(parseShifts(r.res.body).filter((s) => s.to > from && s.from < to));
  }
  /** The scheduler's question, from Graph's facts only: getSchedule for hours and busy time, Shifts for anyone the rota names. */
  async function askOf(req: SuggestRequest): Promise<Result<Ask>> {
    const mails = [...req.parties.map((p) => p.mail), ...(req.room ? [req.room.mail] : [])];
    const sch = await schedule(mails, req.from - DAY, req.to + DAY); if (!sch.ok) return sch;
    let rota: ShiftOf[] = [];
    if (cfg.teamId) { const s = await shifts(req.from - DAY, req.to + DAY); if (!s.ok) return s; rota = s.value; }
    const attendees: Cal[] = []; const why: string[] = [];
    for (const p of req.parties) {
      const s = sch.value.find((x) => x.mail.toLowerCase() === p.mail.toLowerCase())!; const mine = rota.filter((x) => x.personId === p.id);
      if (!s.working) { why.push(`${p.name}: ${s.note || 'the calendar did not return working hours'}. A time is not proposed on a guess.`); continue; }
      const hours: Hours = { days: s.working.days, start: s.working.start, end: s.working.end };
      attendees.push({ id: p.id, name: p.name, tz: s.working.tz, hours, rota: mine.length ? { name: mine[0]!.name, list: mine.map((x) => ({ from: x.from, to: x.to })) } : null, busy: s.busy, optional: !!p.optional });
    }
    if (why.length) return fail('unavailable', why);
    const rs = req.room ? sch.value.find((x) => x.mail.toLowerCase() === req.room!.mail.toLowerCase()) : null;
    return ok({ attendees, room: req.room ? { id: req.room.id, name: req.room.name, tz: attendees[0]?.tz || 'UTC', busy: rs?.busy || [] } : null, minutes: req.minutes, from: req.from, to: req.to, max: req.max });
  }

  return {
    id: 'graph', label: 'Microsoft Graph (mock-tested; not validated against a real tenant)', provenance: P, sent, waits,
    validation: 'Mock-tested: built to Microsoft Graph’s published request and response shapes and exercised against a deterministic mock. NOT validated against a real Microsoft 365 tenant.',
    people: async (query) => { if (query.trim().length < 2) return ok([]); const r = await send<PersonRef[]>(graphCall('people'), reqPeople(query), true); if (!r.ok) return r.out; return r.res.status === 200 ? ok(parsePeople(r.res.body)) : fail('unavailable', [`The directory answered ${r.res.status}.`]); },
    schedule, shifts,
    suggest: async (req): Promise<Result<Slot[]>> => { const a = await askOf(req); return a.ok ? ok(propose(a.value).slots) : a; },
    native: async (req) => { if (kind !== 'delegated') return fail('unavailable', ['findMeetingTimes needs a signed-in user: Microsoft Graph does not support application permissions for it.']); const r = await send<NativeSuggestion[]>(graphCall('suggest'), reqFindMeetingTimes(req, cfg.organizer), true); if (!r.ok) return r.out; return r.res.status === 200 ? ok(parseFindMeetingTimes(r.res.body).suggestions) : fail('unavailable', [`The calendar answered ${r.res.status}.`]); },
    create: async (req): Promise<Result<Created>> => {
      if (!req.transactionId) return fail('invalid', ['A meeting is created with a transaction id, so that a retry can never create it twice.']);
      const had = done.get(req.transactionId) || cfg.known?.(req.transactionId) || null; if (had && had.state === 'RECORDED') return ok({ event: had, again: true });
      if (!req.subject.trim()) return fail('invalid', ['Give the meeting a subject.']);
      if (!(req.to > req.from) || req.from < now()) return fail('invalid', ['The meeting needs a start that is still to come and a later end.']);
      // the re-check: Graph creates an overlapping event without complaint, so availability is asked again immediately before the event is sent
      const a = await askOf({ parties: req.parties, room: req.room, minutes: Math.round((req.to - req.from) / MIN), from: req.from, to: req.to }); if (!a.ok) return a;
      const conflicts = conflictsAt(a.value, req.from, req.to); if (conflicts.length) return fail('conflict', conflicts.map((c) => c.detail), { conflicts });
      const r = await send<Created>(graphCall('create'), reqCreate(cfg, req), true); if (!r.ok) return r.out;
      if (r.res.status !== 201 && r.res.status !== 200) return fail('unavailable', [`The calendar answered ${r.res.status} and did not create the event.`]);
      const event = parseEvent(r.res.body, req); if (!event) return fail('unavailable', ['The calendar answered without an event id; the meeting is not recorded here. Check the calendar before trying again.']);
      done.set(req.transactionId, event); return ok({ event, again: false });
    },
    cancel: async (eventId, comment): Promise<Result<CalEvent>> => {
      const known = [...done.values()].find((e) => e.id === eventId) || null; if (known?.state === 'CANCELLED') return ok(known);
      const r = await send<CalEvent>(graphCall('cancel'), reqCancel(cfg, eventId, comment), false); if (!r.ok) return r.out;
      if (r.res.status === 404) return fail('not-found', [`No meeting ${eventId} is in the calendar.`]);
      if (r.res.status === 400) return fail('invalid', ['Only the organiser of a meeting can cancel it.']);
      if (r.res.status !== 202) return fail('unavailable', [`The calendar answered ${r.res.status} and did not cancel the event.`]);
      const e: CalEvent = known || { id: eventId, transactionId: '', subject: '', body: '', from: 0, to: 0, parties: [], room: null, state: 'RECORDED', createdAt: '' };
      e.state = 'CANCELLED'; e.cancelledAt = new Date(now()).toISOString(); e.cancelReason = comment.slice(0, 300); return ok(e);
    },
  };
}
export const hasBusyAt = (s: ScheduleOf, from: number, to: number): boolean => s.busy.some((b) => overlaps(b, { from, to }));
