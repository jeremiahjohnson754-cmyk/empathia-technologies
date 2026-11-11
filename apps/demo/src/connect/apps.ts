/**
 * The App Jump registry: every way this demonstration hands a person over to another application, one row each.
 *
 * A row is offered in the interface only when its link format was read on the vendor's own documentation (or the standard that
 * defines it) and the row carries that page's address and the date it was read. A format that could not be found on an official
 * page is kept here as `unverified`, so the gap is on record, and is never offered. No row holds a download address: where an app
 * is missing, the fallback is the web address the same vendor documents, or copying the address or number by hand.
 *
 * What "checked" means here, and all it means: the FORMAT of the link matches the published documentation on the date given.
 * No link has been followed against a Microsoft 365 tenant, a Teams client or a telephone (docs/surpass/M365_DEPLOYMENT_AND_TEST_GUIDE.md).
 *
 * Opening an app is not completing an action. Every row says what the person still has to do in the app (`then`), the interface
 * says "Opened …" and never "sent", and the ledger line is `contact.opened`.
 */
export type JumpStatus = 'documented' | 'unverified';
export interface JumpParam { name: string; required: boolean; what: string }
export interface AppJump {
  id: string; app: string; label: string;
  /** what opens, said before the person presses */
  opens: string;
  /** what the person still has to do there; nothing is done for them */
  then: string;
  /** the vendor's template, as published, with <tokens> */
  template: string; params: JumpParam[];
  platform: string;
  /** when the app is not installed: the web address the same vendor documents, or what to do by hand; never a download address */
  fallback: string;
  /** the official page the format was read on, and the date it was read (null: not found on an official page) */
  source: string | null; validated: string | null;
  /** the "last updated" date printed on that page when it was read, when it printed one */
  pageUpdated: string | null;
  status: JumpStatus;
  /** for an unverified row: what was looked for and not found */
  gap?: string;
}
export const VALIDATED = '2026-11-11';
const TEAMS_WORKFLOW = 'https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-workflow';

export const APP_JUMPS: readonly AppJump[] = [
  { id: 'teams.chat', app: 'Teams', label: 'Message in Teams', opens: 'Opens Teams to a chat with {name}', then: 'you write and send the message there',
    template: 'https://teams.microsoft.com/l/chat/0/0?users=<user1>,<user2>,...&topicName=<chat name>&message=<precanned text>',
    params: [{ name: 'users', required: true, what: 'comma-separated sign-in addresses (Microsoft Entra UserPrincipalName, such as an email address)' }, { name: 'topicName', required: false, what: 'a name for a chat of three or more people' }, { name: 'message', required: false, what: 'text placed in the compose box as a draft' }],
    platform: 'An https address on teams.microsoft.com. The documentation says the chat opens in a draft state: the first message must be sent by the person. If a chat with the same people exists, it opens that chat.',
    fallback: 'The link is itself the web address Microsoft documents (teams.microsoft.com). What a browser shows when the Teams app is not installed has not been observed here. Copy the address and write by email instead.',
    source: 'https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-teams', validated: VALIDATED, pageUpdated: '2026-03-26', status: 'documented' },
  { id: 'teams.call', app: 'Teams', label: 'Call in Teams', opens: 'Opens Teams ready to call {name}', then: 'Teams asks you to confirm before it places the call',
    template: 'https://teams.microsoft.com/l/call/0/0?users=<user1>,<user2>',
    params: [{ name: 'users', required: true, what: 'comma-separated sign-in addresses (UserPrincipalName), or 4:<phonenumber> for a telephone number' }, { name: 'withVideo', required: false, what: 'true to start with the caller’s camera on' }],
    platform: 'An https address on teams.microsoft.com. The documentation says: “Before Teams places the call, the client prompts for a confirmation.” It cannot be used to start a meeting.',
    fallback: 'The link is itself the web address Microsoft documents. What a browser shows without the Teams app has not been observed here. Use the telephone number instead.',
    source: TEAMS_WORKFLOW, validated: VALIDATED, pageUpdated: '2026-06-23', status: 'documented' },
  { id: 'teams.meeting', app: 'Teams', label: 'Open Teams’ scheduling form', opens: 'Opens Teams’ own scheduling form with the time, people and subject filled in', then: 'you check it and press Send there; until you do, nobody is invited',
    template: 'https://teams.microsoft.com/l/meeting/new?subject=<meeting subject>&startTime=<date>&endTime=<date>&content=<content>&attendees=<user1>,<user2>,<user3>,...',
    params: [{ name: 'subject', required: false, what: 'the meeting subject' }, { name: 'startTime', required: false, what: 'long ISO 8601 with the UTC offset, for example 2018-03-12T23:55:25+02:00' }, { name: 'endTime', required: false, what: 'ISO 8601 with the UTC offset' }, { name: 'content', required: false, what: 'the meeting details' }, { name: 'attendees', required: false, what: 'comma-separated sign-in addresses (UserPrincipalName)' }],
    platform: 'An https address on teams.microsoft.com. The documentation says a location cannot be given, the UTC offset must be given, and spaces must be encoded as %20, never as “+”.',
    fallback: 'The link is itself the web address Microsoft documents. Without Teams, send the invitation from your own calendar using the time shown on the review step.',
    source: TEAMS_WORKFLOW, validated: VALIDATED, pageUpdated: '2026-06-23', status: 'documented' },
  { id: 'mail.compose', app: 'your email app', label: 'Send email', opens: 'Opens your email app with a message to {name} started', then: 'you finish the message and send it there',
    template: 'mailto:<addr-spec>?subject=<hfvalue>&body=<hfvalue>',
    params: [{ name: 'to', required: true, what: 'the address (addr-spec)' }, { name: 'subject', required: false, what: 'the subject header' }, { name: 'body', required: false, what: 'the first lines of the message; line breaks are %0D%0A' }],
    platform: 'Handled by whichever email app the device has set for mailto links. RFC 6068: spaces are %20, a real “+” is %2B, “?”, “=”, “&” and “%” inside a value are percent-encoded, other alphabets are UTF-8 then percent-encoded.',
    fallback: 'If nothing opens, no email app is set up for mailto links on this device: use “Copy email” and paste the address into your mail.',
    source: 'https://www.rfc-editor.org/rfc/rfc6068.txt', validated: VALIDATED, pageUpdated: '2010-10 (RFC 6068)', status: 'documented' },
  { id: 'phone.call', app: 'your phone', label: 'Call', opens: 'Opens your phone app with {name}’s number entered', then: 'you press call there',
    template: 'tel:<global-number-digits>',
    params: [{ name: 'number', required: true, what: 'the number in international form, starting with “+”; hyphens allowed, no spaces' }],
    platform: 'Handled by the device’s telephone app, or by a calling app set for tel links on a computer. RFC 3966: a global number starts with “+”; visual separators are “-”, “.”, “(”, “)”; spaces are not allowed.',
    fallback: 'If nothing opens, this device has no app for telephone links: use “Copy contact card” and dial the number by hand.',
    source: 'https://www.rfc-editor.org/rfc/rfc3966', validated: VALIDATED, pageUpdated: '2004-12 (RFC 3966)', status: 'documented' },
  { id: 'outlook.web.compose', app: 'Outlook on the web', label: 'Write in Outlook on the web', opens: 'Would open a new message in Outlook on the web', then: 'you would send it there',
    template: 'https://outlook.office.com/mail/deeplink/compose?to=<address>&subject=<subject>&body=<body>', params: [{ name: 'to', required: true, what: 'the address' }],
    platform: 'Not offered.', fallback: 'Use “Send email” (mailto) or “Copy email”.', source: null, validated: null, pageUpdated: null, status: 'unverified',
    gap: 'Searched on 2026-11-11: this address appears only in community questions and forum threads, not on a Microsoft reference page. Until an official page documents it, it is not offered.' },
  { id: 'teams.protocol', app: 'Teams', label: 'Open in the Teams app directly', opens: 'Would open the Teams desktop app without passing through the browser', then: 'you would act there',
    template: 'msteams:/l/chat/0/0?users=<user1>', params: [{ name: 'users', required: true, what: 'sign-in addresses' }],
    platform: 'Not offered.', fallback: 'The documented https address is used instead.', source: null, validated: null, pageUpdated: null, status: 'unverified',
    gap: 'The msteams: protocol form is not on either of the two Microsoft pages read on 2026-11-11. The documented https form is used; this one is not offered.' },
];
export const jumpById = (id: string): AppJump | null => APP_JUMPS.find((j) => j.id === id) || null;
/** The rows the interface may offer: documented, with a source and the date it was read. */
export const offered = (): AppJump[] => APP_JUMPS.filter((j) => j.status === 'documented' && !!j.source && !!j.validated);

/** Percent-encode a value so that nothing in it can end a parameter: everything except unreserved characters (RFC 3986 §2.3). A space is %20, a plus sign %2B. */
export const enc = (s: string): string => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
/** An address for a link: the local part and the domain encoded, the “@” kept. Empty when it is not an address. */
const addr = (mail: string): string => { const m = /^([^@\s]+)@([^@\s]+\.[^@\s]+)$/.exec(mail.trim()); return m ? `${enc(m[1]!)}@${enc(m[2]!)}` : ''; };
/** A telephone number as RFC 3966 writes it: “+”, digits, hyphens. Empty when it is not an international number. */
export const telOf = (phone: string): string => { const t = phone.trim().replace(/[\s.()]/g, '-').replace(/-+/g, '-'); return /^\+\d[\d-]{5,18}\d$/.test(t) ? t : ''; };
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export interface JumpInput { to?: string[]; subject?: string; body?: string; phone?: string; from?: string; until?: string; video?: boolean }
export type Built = { ok: true; id: string; href: string; external: boolean } | { ok: false; id: string; why: string };
/**
 * The link for a row, with every token filled and encoded. Refuses, with the reason, a row that is not offered or an input that
 * lacks what the row requires: a link is never built with a hole in it.
 * `from`/`until` are ISO 8601 with their UTC offset (time.ts › isoLocal).
 */
export function build(id: string, input: JumpInput): Built {
  const j = jumpById(id); if (!j) return { ok: false, id, why: 'No such app jump.' };
  if (j.status !== 'documented' || !j.source) return { ok: false, id, why: `${j.label} is not offered: ${j.gap || 'its link format is not on an official page.'}` };
  const to = (input.to || []).map(addr); if (to.some((x) => !x)) return { ok: false, id, why: 'An address is not a valid email address.' };
  const users = to.map((x) => x.replace('@', '%40')).join(',');
  const subject = clip((input.subject || '').replace(/\s+/g, ' ').trim(), 200); const body = clip((input.body || '').trim(), 1500);
  const q = (pairs: Array<[string, string]>) => pairs.filter(([, v]) => v !== '').map(([k, v]) => `${k}=${v}`).join('&');
  if (id === 'teams.chat') { if (!to.length) return { ok: false, id, why: 'A Teams chat needs at least one person.' }; return { ok: true, id, external: true, href: `https://teams.microsoft.com/l/chat/0/0?${q([['users', users], ['topicName', to.length > 1 ? enc(subject) : ''], ['message', enc(body)]])}` }; }
  if (id === 'teams.call') { if (!to.length) return { ok: false, id, why: 'A Teams call needs at least one person.' }; return { ok: true, id, external: true, href: `https://teams.microsoft.com/l/call/0/0?${q([['users', users], ['withVideo', input.video ? 'true' : '']])}` }; }
  if (id === 'teams.meeting') {
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/; if (!input.from || !input.until || !iso.test(input.from) || !iso.test(input.until)) return { ok: false, id, why: 'A meeting link needs a start and an end, each in ISO 8601 with its UTC offset.' };
    return { ok: true, id, external: true, href: `https://teams.microsoft.com/l/meeting/new?${q([['subject', enc(subject)], ['startTime', enc(input.from)], ['endTime', enc(input.until)], ['content', enc(body)], ['attendees', users]])}` };
  }
  if (id === 'mail.compose') { if (to.length !== 1) return { ok: false, id, why: to.length ? 'An email here is to one address.' : 'An email needs an address.' }; const h = q([['subject', enc(subject)], ['body', enc(body.replace(/\r?\n/g, '\r\n'))]]); return { ok: true, id, external: false, href: `mailto:${to.join(',')}${h ? `?${h}` : ''}` }; }
  if (id === 'phone.call') { const t = telOf(input.phone || ''); if (!t) return { ok: false, id, why: 'The telephone number is not in international form.' }; return { ok: true, id, external: false, href: `tel:${t}` }; }
  return { ok: false, id, why: 'No builder for this app jump.' };
}
/** Is any <token> or {token} of a template left in a link? (Asked by the tests of every offered row.) */
export const hasHole = (href: string): boolean => /[<>{}\s]|=(undefined|null)(&|$)|=(&|$)/.test(href);

// ------------------------------------------------------------------------------------------------------------ return context
export interface ReturnContext { at: string; app: string; jump: string; from: string; about: string }
const RETURN_KEY = 'empathia.demo.connect.return.v1';
/** Remember where the person was when they left for another app, so "Back to where I was" can be offered when they return. This tab only. */
export function rememberReturn(c: ReturnContext): void { try { sessionStorage.setItem(RETURN_KEY, JSON.stringify(c)); } catch { /* not kept */ } }
export function returnContext(): ReturnContext | null {
  try { const s = sessionStorage.getItem(RETURN_KEY); const c = s ? (JSON.parse(s) as ReturnContext) : null; return c && typeof c.from === 'string' && /^#\//.test(c.from) && typeof c.app === 'string' ? c : null; } catch { return null; }
}
export function forgetReturn(): void { try { sessionStorage.removeItem(RETURN_KEY); } catch { /* nothing kept */ } }
