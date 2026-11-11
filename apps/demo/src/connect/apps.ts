/**
 * The App Jump registry (founder's directive of 11 Nov 2026, §03 and §05): every link that opens another application, with where
 * its format comes from and the day it was read. "Verified official deep links only … Do not generate speculative download URLs …
 * distinguish opening an app from completing an action."
 *
 * A link here OPENS something; it sends, calls and books nothing. A format that was not confirmed on the vendor's own page is kept in
 * the registry as `unverified`, with the reason, and `linkFor` returns null for it: the interface cannot offer it.
 * Sources and wording: docs/surpass/M365_DEPLOYMENT_AND_TEST_GUIDE.md.
 */
export type AppId = 'teams.chat' | 'teams.call' | 'teams.meeting' | 'mail' | 'tel' | 'outlook.compose';
export interface AppLink {
  id: AppId; label: string; app: string; /** said before the jump */ opens: string; /** said after it */ opened: string;
  template: string; status: 'verified' | 'standard' | 'unverified'; source: string; validated: string | null; note: string;
  /** when the app is not installed: the vendor's own documented web address, or what to say instead; never a guessed download link */ fallback: string;
}
const WORKFLOW = 'https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-workflow';
export const APPS: Readonly<Record<AppId, AppLink>> = {
  'teams.chat': { id: 'teams.chat', label: 'Message in Teams', app: 'Teams', opens: 'Opens Teams to a chat with them. You write and send the message there.', opened: 'Opened Teams. Nothing has been sent: the message is yours to send there.',
    template: 'https://teams.microsoft.com/l/chat/0/0?users={users}&message={message}', status: 'verified', source: WORKFLOW, validated: '2026-11-11', note: 'users are user principal names; the message is placed in the compose box as a draft', fallback: 'The same address opens Teams on the web when the app is not installed.' },
  'teams.call': { id: 'teams.call', label: 'Call in Teams', app: 'Teams', opens: 'Opens Teams, which asks you to confirm before it places the call.', opened: 'Opened Teams. It asks you to confirm before it calls.',
    template: 'https://teams.microsoft.com/l/call/0/0?users={users}', status: 'verified', source: WORKFLOW, validated: '2026-11-11', note: 'Teams prompts for confirmation before placing the call', fallback: 'The same address opens Teams on the web when the app is not installed.' },
  'teams.meeting': { id: 'teams.meeting', label: 'Open the Teams scheduling form', app: 'Teams', opens: 'Opens the Teams scheduling form filled in with these details. The meeting exists only when you save it there.', opened: 'Opened the Teams scheduling form. No meeting exists until you save it there.',
    template: 'https://teams.microsoft.com/l/meeting/new?subject={subject}&startTime={startTime}&endTime={endTime}&content={content}&attendees={users}', status: 'verified', source: WORKFLOW, validated: '2026-11-11', note: 'times in ISO 8601 with the UTC offset; spaces as %20, never +; a location cannot be given', fallback: 'The same address opens Teams on the web when the app is not installed.' },
  mail: { id: 'mail', label: 'Send email', app: 'your mail application', opens: 'Opens your mail application with a new message addressed to them. You send it there.', opened: 'Opened your mail application. Nothing has been sent.',
    template: 'mailto:{to}?subject={subject}&body={body}', status: 'standard', source: 'IETF RFC 6068', validated: null, note: 'the mailto scheme; which application opens is the device’s choice', fallback: 'If no mail application opens, copy the address instead.' },
  tel: { id: 'tel', label: 'Call', app: 'your telephone', opens: 'Opens your telephone application with their number. You place the call.', opened: 'Opened your telephone application. No call has been placed by Empathia.',
    template: 'tel:{number}', status: 'standard', source: 'IETF RFC 3966', validated: null, note: 'the tel scheme', fallback: 'If nothing opens, copy the number instead.' },
  'outlook.compose': { id: 'outlook.compose', label: 'Compose in Outlook on the web', app: 'Outlook', opens: '', opened: '',
    template: '', status: 'unverified', source: '', validated: null, note: 'No official page confirming a compose address was found on 2026-11-11, so it is not offered. Send email uses the mailto scheme.', fallback: '' },
};

const enc = (v: string) => encodeURIComponent(v);   // encodeURIComponent writes a space as %20, as the Teams page requires
/** A list of user principal names: each encoded, joined by a literal comma. */
const users = (list: readonly string[]) => list.map(enc).join(',');
export interface JumpParams { users?: readonly string[]; message?: string; subject?: string; body?: string; content?: string; startTime?: string; endTime?: string; number?: string }
/**
 * Build the link, or null when it may not be offered (unverified, or a required value is missing or malformed).
 * Optional values that are empty are left out together with their parameter, so no link carries an empty or unfilled field.
 */
export function linkFor(id: AppId, p: JumpParams): string | null {
  const a = APPS[id]; if (!a || a.status === 'unverified') return null;
  const u = (p.users || []).filter((x) => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(x));
  const q = (pairs: Array<[string, string | undefined]>) => pairs.filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${v}`).join('&');
  if (id === 'teams.chat') return u.length ? `https://teams.microsoft.com/l/chat/0/0?${q([['users', users(u)], ['message', p.message ? enc(p.message) : undefined]])}` : null;
  if (id === 'teams.call') return u.length ? `https://teams.microsoft.com/l/call/0/0?${q([['users', users(u)]])}` : null;
  if (id === 'teams.meeting') {
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/; if (!p.startTime || !p.endTime || !iso.test(p.startTime) || !iso.test(p.endTime)) return null;
    return `https://teams.microsoft.com/l/meeting/new?${q([['subject', p.subject ? enc(p.subject) : undefined], ['startTime', enc(p.startTime)], ['endTime', enc(p.endTime)], ['content', p.content ? enc(p.content) : undefined], ['attendees', u.length ? users(u) : undefined]])}`;
  }
  if (id === 'mail') return u.length === 1 ? `mailto:${u[0]!.replace(/[^A-Za-z0-9@._-]/g, enc)}${p.subject || p.body ? `?${q([['subject', p.subject ? enc(p.subject) : undefined], ['body', p.body ? enc(p.body) : undefined]])}` : ''}` : null;
  if (id === 'tel') { const n = (p.number || '').replace(/[^\d+]/g, ''); return /^\+?\d{7,15}$/.test(n) ? `tel:${n}` : null; }
  return null;
}
