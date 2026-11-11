/**
 * A deterministic MOCK of the part of Microsoft Graph the calendar adapter uses. Test support only: no page imports this file, and
 * nothing here is a claim about how a real tenant behaves beyond the shapes copied from the documentation.
 *
 * FIXTURES are examples copied from learn.microsoft.com on 2026-11-11, each with the page it came from. The mock answers in those
 * shapes, with content taken from a SimWorld (adapter.ts), so the same people, hours, shifts and busy time sit behind the simulated
 * adapter and behind the Graph adapter, and one contract suite can be run against both.
 *
 * Where the documentation read on that date does not say what the server does, the mock's behaviour is an ASSUMPTION and is listed
 * in ASSUMPTIONS, so that real validation knows what to observe.
 */
import { propose } from './calendar.js';
import { simAsk, simRoomBusy, simBusy, simShifts, type SimWorld } from './adapter.js';
import { GRAPH_BASE, toWindows, type HttpRequest, type HttpResponse, type Transport } from './graph.js';
import { MIN, overlaps } from './time.js';

export interface Fixture { source: string; validated: string; note: string; status: number; headers: Record<string, string>; body: unknown }
const D = '2026-11-11';
/** Examples as published. Shortened where the page's own example is long; nothing is added. */
export const FIXTURES: Readonly<Record<string, Fixture>> = {
  getSchedule: { source: 'https://learn.microsoft.com/en-us/graph/api/calendar-getschedule', validated: D, note: 'the first schedule of the page’s example response (requested with Prefer: outlook.timezone="Pacific Standard Time")', status: 200, headers: { 'Content-type': 'application/json' },
    body: { '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#Collection(microsoft.graph.scheduleInformation)', value: [{ scheduleId: 'adelev@contoso.com', availabilityView: '000220130',
      scheduleItems: [
        { isPrivate: false, status: 'busy', subject: "Let's go for lunch", location: "Harry's Bar", start: { dateTime: '2019-03-15T12:00:00.0000000', timeZone: 'Pacific Standard Time' }, end: { dateTime: '2019-03-15T14:00:00.0000000', timeZone: 'Pacific Standard Time' } },
        { subject: 'free is represented by 0 in availabilityView', status: 'free', start: { dateTime: '2019-03-15T10:00:00.0000000', timeZone: 'Pacific Standard Time' }, end: { dateTime: '2019-03-15T11:00:00.0000000', timeZone: 'Pacific Standard Time' } },
        { subject: 'workingElsewhere is also represented by 0 in availabilityView', status: 'workingElsewhere', start: { dateTime: '2019-03-15T11:00:00.0000000', timeZone: 'Pacific Standard Time' }, end: { dateTime: '2019-03-15T12:00:00.0000000', timeZone: 'Pacific Standard Time' } },
        { subject: 'tentative is represented by 1 in availabilityView', status: 'tentative', start: { dateTime: '2019-03-15T15:00:00.0000000', timeZone: 'Pacific Standard Time' }, end: { dateTime: '2019-03-15T16:00:00.0000000', timeZone: 'Pacific Standard Time' } },
      ],
      workingHours: { daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], startTime: '08:00:00.0000000', endTime: '17:00:00.0000000', timeZone: { name: 'Pacific Standard Time' } } }] } },
  findMeetingTimes: { source: 'https://learn.microsoft.com/graph/api/user-findmeetingtimes', validated: D, note: 'the first of the five suggestions in the page’s example response', status: 200, headers: { 'Content-type': 'application/json', 'Preference-Applied': 'outlook.timezone="Pacific Standard Time"' },
    body: { '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#microsoft.graph.meetingTimeSuggestionsResult', emptySuggestionsReason: '', meetingTimeSuggestions: [{ confidence: 100, order: 1, organizerAvailability: 'free', suggestionReason: 'Suggested because it is one of the nearest times when all attendees are available.',
      attendeeAvailability: [{ availability: 'free', attendee: { emailAddress: { address: 'alexw@contoso.com' } } }], locations: [{ displayName: 'Conf room Hood' }],
      meetingTimeSlot: { start: { dateTime: '2019-04-18T16:00:00.0000000', timeZone: 'Pacific Standard Time' }, end: { dateTime: '2019-04-18T17:00:00.0000000', timeZone: 'Pacific Standard Time' } } }] } },
  createEventRequest: { source: 'https://learn.microsoft.com/en-us/graph/api/user-post-events', validated: D, note: 'the request body of the page’s Example 1, which sets transactionId', status: 201, headers: { 'Content-type': 'application/json' },
    body: { subject: "Let's go for lunch", body: { contentType: 'HTML', content: 'Does noon work for you?' }, start: { dateTime: '2017-04-15T12:00:00', timeZone: 'Pacific Standard Time' }, end: { dateTime: '2017-04-15T14:00:00', timeZone: 'Pacific Standard Time' }, location: { displayName: "Harry's Bar" },
      attendees: [{ emailAddress: { address: 'samanthab@contoso.com', name: 'Samantha Booth' }, type: 'required' }], allowNewTimeProposals: true, transactionId: '7E163156-7762-4BEB-A1C6-729EA81755A7' } },
  cancelEvent: { source: 'https://learn.microsoft.com/en-us/graph/api/event-cancel', validated: D, note: 'the page’s response: 202 Accepted and no body', status: 202, headers: {}, body: null },
  shifts: { source: 'https://learn.microsoft.com/cs-cz/graph/api/schedule-list-shifts?view=graph-rest-beta', validated: D, note: 'the page’s example response (the beta-version page; the v1.0 shift resource lists the same List method), draftShift left out', status: 200, headers: { 'Content-type': 'application/json' },
    body: { value: [{ id: 'SHFT_577b75d2-a927-48c0-a5d1-dc984894e7b8', createdDateTime: '2019-03-14T04:32:51.451Z', lastModifiedDateTime: '2019-03-14T05:32:51.451Z', userId: 'c5d0c76b-80c4-481c-be50-923cd8d680a1', schedulingGroupId: 'TAG_228940ed-ff84-4e25-b129-1b395cf78be0',
      sharedShift: { displayName: 'Day shift', notes: 'Please do inventory as part of your shift.', startDateTime: '2019-03-11T15:00:00Z', endDateTime: '2019-03-12T00:00:00Z', theme: 'blue', activities: [{ isPaid: true, startDateTime: '2019-03-11T15:00:00Z', endDateTime: '2019-03-11T15:15:00Z', code: '', displayName: 'Lunch' }] } }] } },
  throttled: { source: 'https://learn.microsoft.com/graph/throttling', validated: D, note: 'the page’s example 429 response', status: 429, headers: { 'Content-Length': '312', 'Content-Type': 'application/json', 'Retry-After': '10' },
    body: { error: { code: 'TooManyRequests', innerError: { code: '429', date: '2020-08-18T12:51:51', message: 'Please retry after', 'request-id': '94fb3b52-452a-4535-a601-69e0a90e3aa2', status: '429' }, message: 'Please retry again later.' } } },
  error: { source: 'https://learn.microsoft.com/en-us/graph/errors', validated: D, note: 'the page’s example of a full JSON error body; the mock reuses its shape for 401 and 403 with a status-appropriate code, which is illustrative (the adapter reads only the HTTP status)', status: 400, headers: { 'Content-Type': 'application/json' },
    body: { error: { code: 'badRequest', message: 'Uploaded fragment overlaps with existing data.', innerError: { code: 'invalidRange', 'request-id': 'request-id', date: 'date-time' } } } },
  users: { source: 'https://learn.microsoft.com/graph/api/user-list', validated: D, note: 'the default properties the page lists for a user, as one user (values invented in the reserved example domain; the page’s own example values were not copied)', status: 200, headers: { 'Content-type': 'application/json' },
    body: { value: [{ businessPhones: ['+1-212-555-0100'], displayName: 'Example Person', givenName: 'Example', id: '00000000-0000-4000-8000-000000000001', jobTitle: 'Example title', mail: 'example.person@empathia.example', mobilePhone: null, officeLocation: null, preferredLanguage: 'en-US', surname: 'Person', userPrincipalName: 'example.person@empathia.example' }] } },
};
/** What the mock does where the pages read on 2026-11-11 are silent. Each is to be observed against a real tenant before it is relied on. */
export const ASSUMPTIONS: readonly string[] = [
  'A second POST /events with a transactionId already used returns the first event and creates nothing (the property’s stated purpose; the response itself is not documented on the pages read).',
  'Creating an event that overlaps another is accepted (Graph has no documented refusal); the adapter, not the server, refuses a conflict.',
  'A request without a bearer token is answered 401; a caller without the permission is answered 403; the error code strings are illustrative.',
  'A throttled request has not been processed.',
  'Working hours come back with a Windows time-zone name for each of the directory’s zones.',
];

const guid = (s: string) => { let h1 = 0x811c9dc5; let h2 = 0x1b873593; for (let i = 0; i < s.length; i += 1) { h1 = Math.imul(h1 ^ s.charCodeAt(i), 0x01000193) >>> 0; h2 = Math.imul(h2 ^ s.charCodeAt(i), 0x85ebca6b) >>> 0; } const x = (n: number) => n.toString(16).padStart(8, '0'); const a = x(h1); const b = x(h2); const c = x((Math.imul(h1, 31) ^ h2) >>> 0); const d = x((Math.imul(h2, 17) ^ h1) >>> 0); return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-8${c.slice(1, 4)}-${c.slice(4)}${d}`; };
const frac = (ms: number) => `${new Date(ms).toISOString().slice(0, 19)}.0000000`;
const gt = (ms: number) => ({ dateTime: frac(ms), timeZone: 'UTC' });
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const errorBody = (code: string, message: string) => ({ error: { code, message, innerError: { code, 'request-id': 'mock-request', date: '2026-11-11T00:00:00' } } });

export interface MockEvent { id: string; transactionId: string; organizer: string; subject: string; from: number; to: number; attendees: Array<{ mail: string; type: string }>; cancelled: boolean }
export interface MockTenant {
  transport: Transport;
  /** every request received, as received (with its Authorization header) */
  received: HttpRequest[]; events: MockEvent[];
  /** the directory object id the mock gives a person (what Shifts calls userId) */
  idOf: (personId: string) => string;
  /** make the next n requests answer 429 with Retry-After */
  throttle: (n: number, retryAfterSeconds?: number) => void;
  /** answer a call with 401 or 403 until cleared */
  deny: (call: 'users' | 'getSchedule' | 'events' | 'cancel' | 'shifts' | 'findMeetingTimes' | null, status?: 401 | 403) => void;
  /** process the next create, then drop the answer (the client times out although the server created the event) */
  dropNextAnswer: () => void;
  /** put something in a mailbox from outside: a meeting made by somebody else, in between */
  block: (mail: string, from: number, to: number) => void;
}
/** A mock tenant holding the same people, rooms, hours, shifts and busy time as a SimWorld. `organizer` is the signed-in user's address (what /me means). */
export function mockTenant(world: SimWorld, organizer: string): MockTenant {
  const received: HttpRequest[] = []; const events: MockEvent[] = []; const extra: Array<{ mail: string; from: number; to: number }> = [];
  let throttle = 0; let retryAfter = 10; let denied: { call: string; status: number } | null = null; let drop = false;
  const idOf = (personId: string) => guid(`user:${personId}`); const json = (status: number, body: unknown, headers: Record<string, string> = {}): HttpResponse => ({ status, headers: { 'Content-Type': 'application/json', ...headers }, body });
  const busyOf = (mail: string, from: number, to: number) => {
    const p = world.people.find((x) => x.mail === mail); const r = world.rooms.find((x) => x.mail === mail);
    const base = p ? simBusy(world, p, from, to) : r ? simRoomBusy(world, r.id, from, to) : [];
    const mine = events.filter((e) => !e.cancelled && (e.organizer === mail || e.attendees.some((a) => a.mail === mail)) && overlaps(e, { from, to })).map((e) => ({ from: e.from, to: e.to, title: e.subject }));
    return [...base, ...mine, ...extra.filter((x) => x.mail === mail && overlaps(x, { from, to })).map((x) => ({ from: x.from, to: x.to, title: 'Busy' }))].sort((a, b) => a.from - b.from);
  };
  const transport: Transport = async (req) => {
    received.push(req); const url = req.url.startsWith(GRAPH_BASE) ? req.url.slice(GRAPH_BASE.length) : req.url; const path = url.split('?')[0]!; const qs = new URLSearchParams(url.split('?')[1] || '');
    const call = /\/calendar\/getSchedule$/.test(path) ? 'getSchedule' : /\/findMeetingTimes$/.test(path) ? 'findMeetingTimes' : /\/events\/[^/]+\/cancel$/.test(path) ? 'cancel' : /\/events$/.test(path) ? 'events' : /\/schedule\/shifts$/.test(path) ? 'shifts' : path === '/users' ? 'users' : 'unknown';
    if (!/^Bearer \S+/.test(req.headers['Authorization'] || '')) return json(401, errorBody('InvalidAuthenticationToken', 'Access token is empty.'));
    if (throttle > 0) { throttle -= 1; return json(429, FIXTURES['throttled']!.body, { 'Retry-After': String(retryAfter) }); }
    if (denied && denied.call === call) return json(denied.status, errorBody(denied.status === 401 ? 'InvalidAuthenticationToken' : 'accessDenied', denied.status === 401 ? 'Access token has expired or is not yet valid.' : 'Access is denied. Check credentials and try again.'));
    const me = /^\/users\/([^/]+)\//.exec(path); const mailboxOf = me ? decodeURIComponent(me[1]!) : organizer; const body = (req.body || {}) as Record<string, unknown>;
    if (call === 'users' && req.method === 'GET') {
      if (req.headers['ConsistencyLevel'] !== 'eventual' || qs.get('$count') !== 'true') return json(400, errorBody('Request_UnsupportedQuery', 'Request with $search query parameter only works through MSGraph with a special request header.'));
      const q = (/displayName:(.*)"$/.exec(qs.get('$search') || '')?.[1] || '').trim().toLowerCase();
      return json(200, { '@odata.count': 0, value: world.people.filter((p) => q && p.name.toLowerCase().includes(q)).slice(0, Number(qs.get('$top') || 10)).map((p) => ({ businessPhones: [p.phone], displayName: p.name, givenName: p.name.split(' ')[0], id: idOf(p.id), jobTitle: p.title, mail: p.mail, mobilePhone: null, officeLocation: null, preferredLanguage: 'en-US', surname: p.name.split(' ').slice(1).join(' '), userPrincipalName: p.mail })) });
    }
    if (call === 'getSchedule' && req.method === 'POST') {
      const from = Date.parse(`${(body['startTime'] as { dateTime: string }).dateTime}Z`); const to = Date.parse(`${(body['endTime'] as { dateTime: string }).dateTime}Z`); const step = Number(body['availabilityViewInterval'] || 30) * MIN;
      return json(200, { '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#Collection(microsoft.graph.scheduleInformation)', value: (body['schedules'] as string[]).map((mail) => {
        const p = world.people.find((x) => x.mail === mail); const r = world.rooms.find((x) => x.mail === mail); const busy = busyOf(mail, from, to);
        if (!p && !r) return { scheduleId: mail, availabilityView: '', scheduleItems: [], error: { message: 'Unable to resolve the address.', responseCode: 'ErrorMailRecipientNotFound' } };
        let view = ''; for (let t = from; t < to; t += step) view += busy.some((b) => overlaps(b, { from: t, to: t + step })) ? '2' : '0';
        const h = p ? p.shift || p.hours : null;
        return { scheduleId: mail, availabilityView: view, scheduleItems: busy.map((b) => ({ isPrivate: false, status: 'busy', start: gt(b.from), end: gt(b.to) })),
          ...(p && h ? { workingHours: { daysOfWeek: h.days.map((d) => DAYS[d]), startTime: `${h.start}:00.0000000`, endTime: `${h.end}:00.0000000`, timeZone: { name: toWindows(p.tz) || p.tz } } } : {}) };
      }) });
    }
    if (call === 'shifts' && req.method === 'GET') {
      const f = qs.get('$filter') || ''; const a = Date.parse(/startDateTime ge (\S+)/.exec(f)?.[1] || ''); const z = Date.parse(/endDateTime le (\S+)/.exec(f)?.[1] || '');
      return json(200, { value: simShifts(world, a, z).filter((s) => s.from >= a && s.to <= z).map((s) => ({ id: `SHFT_${guid(`${s.personId}:${s.from}`)}`, createdDateTime: '2026-11-01T00:00:00.000Z', lastModifiedDateTime: '2026-11-01T00:00:00.000Z', userId: idOf(s.personId), schedulingGroupId: `TAG_${guid('service')}`,
        sharedShift: { displayName: s.name, notes: null, startDateTime: new Date(s.from).toISOString(), endDateTime: new Date(s.to).toISOString(), theme: 'blue', activities: [] } })) });
    }
    if (call === 'findMeetingTimes' && req.method === 'POST') {
      const tc = body['timeConstraint'] as { timeSlots: Array<{ start: { dateTime: string }; end: { dateTime: string } }> }; const from = Date.parse(`${tc.timeSlots[0]!.start.dateTime}Z`); const to = Date.parse(`${tc.timeSlots[0]!.end.dateTime}Z`);
      const minutes = Number(/PT(\d+)M/.exec(String(body['meetingDuration'] || 'PT30M'))?.[1] || 30); const att = (body['attendees'] as Array<{ type: string; emailAddress: { address: string; name: string } }>) || [];
      const party = (mail: string) => { const p = world.people.find((x) => x.mail === mail)!; return { id: p.id, name: p.name, mail }; };
      const { ask } = simAsk(world, { parties: [party(mailboxOf), ...att.filter((x) => x.type !== 'resource').map((x) => party(x.emailAddress.address))], room: null, minutes, from, to, max: Number(body['maxCandidates'] || 6) });
      const slots = propose(ask).slots;
      return json(200, { '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#microsoft.graph.meetingTimeSuggestionsResult', emptySuggestionsReason: slots.length ? '' : 'AttendeesUnavailable', meetingTimeSuggestions: slots.map((s, i) => ({ confidence: 100, order: i + 1, organizerAvailability: 'free', suggestionReason: 'Suggested because it is one of the nearest times when all attendees are available.',
        attendeeAvailability: att.filter((x) => x.type !== 'resource').map((x) => ({ availability: 'free', attendee: { emailAddress: { address: x.emailAddress.address } } })), locations: [], meetingTimeSlot: { start: gt(s.from), end: gt(s.to) } })) });
    }
    if (call === 'events' && req.method === 'POST') {
      const tx = String(body['transactionId'] || ''); let e = tx ? events.find((x) => x.transactionId === tx && x.organizer === mailboxOf) : undefined;
      if (!e) { e = { id: `AAMkAG${guid(`${mailboxOf}:${tx || events.length}`).replace(/-/g, '')}=`, transactionId: tx, organizer: mailboxOf, subject: String(body['subject'] || ''), from: Date.parse(`${(body['start'] as { dateTime: string }).dateTime}Z`), to: Date.parse(`${(body['end'] as { dateTime: string }).dateTime}Z`), attendees: ((body['attendees'] as Array<{ emailAddress: { address: string }; type: string }>) || []).map((a) => ({ mail: a.emailAddress.address, type: a.type })), cancelled: false }; events.push(e); }
      if (drop) { drop = false; throw new Error('mock: the answer was lost'); }
      return json(201, { '@odata.context': "https://graph.microsoft.com/v1.0/$metadata#users('me')/events/$entity", id: e.id, createdDateTime: '2026-11-11T00:00:00.0000000Z', iCalUId: guid(e.id), subject: e.subject, isCancelled: false, isOrganizer: true, start: gt(e.from), end: gt(e.to), attendees: body['attendees'], location: body['location'] || { displayName: '' }, organizer: { emailAddress: { address: mailboxOf } }, transactionId: e.transactionId });
    }
    if (call === 'cancel' && req.method === 'POST') {
      const id = decodeURIComponent(/\/events\/([^/]+)\/cancel$/.exec(path)![1]!); const e = events.find((x) => x.id === id);
      if (!e || e.cancelled) return json(404, errorBody('ErrorItemNotFound', 'The specified object was not found in the store.'));
      if (e.organizer !== mailboxOf) return json(400, errorBody('ErrorInvalidRequest', "Your request can't be completed. You need to be an organizer to cancel a meeting."));
      e.cancelled = true; return { status: 202, headers: {}, body: null };
    }
    return json(404, errorBody('ResourceNotFound', `Resource not found for the segment '${path}'.`));
  };
  return { transport, received, events, idOf, throttle: (n, s = 10) => { throttle = n; retryAfter = s; }, deny: (call, status = 403) => { denied = call ? { call, status } : null; }, dropNextAnswer: () => { drop = true; }, block: (mail, from, to) => { extra.push({ mail, from, to }); } };
}
/** Do two JSON values have the same shape: the same keys at every level (arrays compared by their first element; null matches anything)? */
export function sameShape(a: unknown, b: unknown, path = '$'): string[] {
  if (a === null || b === null || a === undefined || b === undefined) return [];
  if (Array.isArray(a) || Array.isArray(b)) { if (!Array.isArray(a) || !Array.isArray(b)) return [`${path}: one is a list`]; return a.length && b.length ? sameShape(a[0], b[0], `${path}[0]`) : []; }
  if (typeof a !== typeof b) return [`${path}: ${typeof a} against ${typeof b}`];
  if (typeof a !== 'object') return [];
  const A = Object.keys(a as object).sort(); const B = Object.keys(b as object).sort(); const out: string[] = [];
  for (const k of A) if (!B.includes(k)) out.push(`${path}.${k}: missing in the second`);
  for (const k of B) if (!A.includes(k)) out.push(`${path}.${k}: missing in the first`);
  for (const k of A) if (B.includes(k)) out.push(...sameShape((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`));
  return out;
}
