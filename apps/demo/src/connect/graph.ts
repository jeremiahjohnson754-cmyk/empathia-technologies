/**
 * The Microsoft Graph implementation of the calendar adapter (founder, 11 Nov 2026: "Finish the correct Microsoft Graph adapter
 * architecture … contract/integration tests using deterministic simulations and mocks … Do not present these as verified production
 * integrations").
 *
 * STATUS: mock-tested only. It builds the documented request for each call and reads the documented response shape; in tests it is
 * given a transport that answers from fixtures written from the documentation. It has never been given a network transport, a token
 * or a tenant, and the product does not offer it. Calls, permissions and wording: docs/surpass/M365_DEPLOYMENT_AND_TEST_GUIDE.md
 * (each read on learn.microsoft.com on 2026-11-11).
 *
 * The transport is synchronous here because the demonstration's adapter interface is; a deployed adapter would be asynchronous with
 * the same requests and the same handling. A deployed adapter also waits for Retry-After; here the wait is reported, not slept.
 */
import type { Busy, CalendarAdapter, CreateRequest, CreateResult, ScheduleOf } from './calendar.js';

export interface GraphRequest { method: 'GET' | 'POST' | 'DELETE'; path: string; headers: Record<string, string>; body?: unknown }
export interface GraphResponse { status: number; headers?: Record<string, string>; body?: unknown }
export type Transport = (r: GraphRequest) => GraphResponse;

export const GRAPH_CALLS = {
  getSchedule: { permission: 'Calendars.ReadBasic', source: 'https://learn.microsoft.com/en-us/graph/api/calendar-getschedule?view=graph-rest-1.0', validated: '2026-11-11' },
  createEvent: { permission: 'Calendars.ReadWrite', source: 'https://learn.microsoft.com/en-us/graph/api/user-post-events?view=graph-rest-1.0', validated: '2026-11-11' },
  cancelEvent: { permission: 'Calendars.ReadWrite', source: 'https://learn.microsoft.com/en-us/graph/api/event-cancel?view=graph-rest-1.0', validated: '2026-11-11' },
  listShifts: { permission: 'Schedule.Read.All', source: 'https://learn.microsoft.com/en-us/graph/api/schedule-list-shifts?view=graph-rest-1.0', validated: '2026-11-11' },
  throttling: { permission: '', source: 'https://learn.microsoft.com/en-us/graph/throttling', validated: '2026-11-11' },
} as const;

const dt = (isoUtc: string) => ({ dateTime: isoUtc.replace(/\.\d{3}Z$|Z$/, ''), timeZone: 'UTC' });
const JSON_H = { 'Content-Type': 'application/json' };
/** POST /users/{id}/calendar/getSchedule — schedules are SMTP addresses; the interval is 30 minutes (the default the page gives). */
export function getScheduleRequest(organizer: string, addresses: readonly string[], from: string, to: string): GraphRequest {
  return { method: 'POST', path: `/users/${encodeURIComponent(organizer)}/calendar/getSchedule`, headers: { ...JSON_H, Prefer: 'outlook.timezone="UTC"' }, body: { schedules: [...addresses], startTime: dt(from), endTime: dt(to), availabilityViewInterval: 30 } };
}
/** POST /users/{id}/events — a Teams meeting; the transactionId is the client's, and is the same on every retry of one confirmation. */
export function createEventRequest(organizer: string, r: CreateRequest): GraphRequest {
  return { method: 'POST', path: `/users/${encodeURIComponent(organizer)}/events`, headers: { ...JSON_H, Prefer: 'outlook.timezone="UTC"' }, body: {
    subject: r.subject, body: { contentType: 'text', content: r.body }, start: dt(r.start), end: dt(r.end),
    attendees: [...r.attendees.map((a) => ({ emailAddress: { address: a }, type: 'required' })), ...(r.room ? [{ emailAddress: { address: r.room }, type: 'resource' }] : [])],
    ...(r.online ? { isOnlineMeeting: true, onlineMeetingProvider: 'teamsForBusiness' } : {}), transactionId: r.transactionId } };
}
export const cancelEventRequest = (organizer: string, eventId: string): GraphRequest => ({ method: 'POST', path: `/users/${encodeURIComponent(organizer)}/events/${encodeURIComponent(eventId)}/cancel`, headers: JSON_H, body: { comment: 'Cancelled from Empathia' } });

const asUtc = (x: { dateTime?: string } | undefined) => (x?.dateTime ? new Date(`${x.dateTime.replace(/\.\d+$/, '')}Z`).toISOString() : '');
/** Read a getSchedule response. Anything not of the documented shape is dropped, never guessed at. */
export function parseSchedule(body: unknown): ScheduleOf[] {
  const value = (body as { value?: unknown })?.value; if (!Array.isArray(value)) return [];
  return value.flatMap((v): ScheduleOf[] => { const o = (v && typeof v === 'object' ? v : {}) as { scheduleId?: unknown; scheduleItems?: unknown }; if (typeof o.scheduleId !== 'string') return [];
    const busy: Busy[] = (Array.isArray(o.scheduleItems) ? o.scheduleItems : []).flatMap((it): Busy[] => { const i = (it && typeof it === 'object' ? it : {}) as { status?: string; subject?: string; isPrivate?: boolean; start?: { dateTime?: string }; end?: { dateTime?: string } };
      const from = asUtc(i.start); const to = asUtc(i.end); if (!from || !to || i.status === 'free') return [];
      return [{ from, to, what: i.isPrivate || !i.subject ? 'Busy' : i.subject }]; });
    return [{ address: o.scheduleId, busy, provenance: 'MOCK' }]; });
}
/** What an error means, in words a person can act on. 401 and 403 are never retried; 429 carries the wait the service asked for. */
export function failure(res: GraphResponse, permission: string): Extract<CreateResult, { ok: false }> {
  const ra = Number(res.headers?.['Retry-After'] ?? res.headers?.['retry-after']);
  if (res.status === 401) return { ok: false, code: 'unauthorized', message: 'You are not signed in to Microsoft 365, or the sign-in has expired. Sign in again.' };
  if (res.status === 403) return { ok: false, code: 'forbidden', message: `Not authorised. Ask your administrator for the ${permission} permission for Empathia.` };
  if (res.status === 429) return { ok: false, code: 'throttled', message: `Microsoft 365 asked us to wait${Number.isFinite(ra) ? ` ${ra} seconds` : ''} before trying again.`, ...(Number.isFinite(ra) ? { retryAfter: ra } : {}) };
  if (res.status === 409 || res.status === 412) return { ok: false, code: 'conflict', message: 'The calendar changed while this was being saved. Check the time again.' };
  return { ok: false, code: 'failed', message: `Microsoft 365 answered ${res.status}. Nothing was created.` };
}

/**
 * The adapter over a transport. `retries` bounds how many times a throttled call is repeated; each repeat sends the SAME request
 * (so the same transactionId), and the waits the service asked for are collected in `waited` for the caller to honour and show.
 */
export function graphAdapter(organizer: string, transport: Transport, opts: { retries?: number; provenance?: 'MOCK' | 'LIVE' } = {}): CalendarAdapter & { waited: number[]; sent: GraphRequest[] } {
  const waited: number[] = []; const sent: GraphRequest[] = []; const retries = opts.retries ?? 2; const provenance = opts.provenance ?? 'MOCK';
  const send = (req: GraphRequest): GraphResponse => { let res: GraphResponse = { status: 0 };
    for (let n = 0; n <= retries; n += 1) { sent.push(req); res = transport(req); if (res.status !== 429) return res; const ra = Number(res.headers?.['Retry-After'] ?? res.headers?.['retry-after']); waited.push(Number.isFinite(ra) ? ra : 2 ** n); }
    return res; };
  return {
    id: 'graph', provenance, waited, sent, connected: () => [],
    getSchedule(addresses, from, to) { const res = send(getScheduleRequest(organizer, addresses, from, to)); return res.status === 200 ? parseSchedule(res.body).map((s) => ({ ...s, provenance })) : []; },
    createEvent(r) { const res = send(createEventRequest(organizer, r)); const id = (res.body as { id?: unknown })?.id;
      return res.status === 201 && typeof id === 'string' ? { ok: true, eventId: id, provenance } : failure(res, GRAPH_CALLS.createEvent.permission); },
    cancelEvent(eventId) { const res = send(cancelEventRequest(organizer, eventId)); return { ok: res.status === 202 }; },
  };
}
