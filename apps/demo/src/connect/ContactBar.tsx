/**
 * The contact action bar, and "who to contact" for a room, a device, a building or an issue.
 *
 * Every action says what will happen before it is pressed. After a jump the bar says the app was opened and what the person still
 * has to do there; it never says a message was sent, a call made or an invitation delivered, because it cannot know. Actions the
 * role may not use are not drawn (D44). Every person here is synthetic, and the bar says so once, beside the actions.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Tag } from '@empathia/ui';
import type { RoleKey } from '../registry.types.js';
import { canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { buildingByKey } from '../campus/canon.js';
import * as S from '../workspace/store.js';
import { RELATION_WORD, availabilityAt, backupFor, contactsFor, freshnessOf, personById, subjectOf, type Contact, type EntityKind, type Person, type Subject } from './directory.js';
import { mayKnowWho, mayReach, maySchedule, maySeeDetails } from './access.js';
import { build, forgetReturn, jumpById, rememberReturn, returnContext, type JumpInput } from './apps.js';
import { STATE_KEY, busyOf, cardOf, composeFor, loadState, meetingsInRoom, recordCopy, recordJump, type State } from './store.js';
import { DAY, fmtDay, fmtRange, fmtTime, zoneCity } from './time.js';
import { workingIn } from './calendar.js';

type IconName = 'chat' | 'mail' | 'copy' | 'card' | 'phone' | 'calendar' | 'clock' | 'person' | 'place' | 'swap' | 'video';
const PATHS: Record<IconName, string> = {
  chat: 'M4 5h16v11H9.5L5 19.5V16H4z', mail: 'M3.5 6h17v12h-17zM3.5 7l8.5 6 8.5-6', copy: 'M8.5 8.5h11v11h-11zM5 15.5V4.5h10.5', card: 'M3.5 5.5h17v13h-17zM7 10h4M7 13.5h4M15.5 9.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5ZM13 16c.5-1.4 4.5-1.4 5 0',
  phone: 'M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z', calendar: 'M4 6h16v14H4zM4 10h16M8 3.5v4M16 3.5v4', clock: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17ZM12 7.5V12l3 2',
  person: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM4.5 20c1-4.5 14-4.5 15 0', place: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11ZM12 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z', swap: 'M4 8h13l-3-3M20 16H7l3 3', video: 'M3.5 7h11v10h-11zM14.5 10.5l6-3v9l-6-3',
};
export function CxIcon({ name, size = 20 }: { name: IconName; size?: number }) { return <svg className="cx-ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={PATHS[name]} /></svg>; }

/** The connect state and the shared workspace, read fresh: re-read after every action here and whenever another tab changes either. */
export function useConnect() {
  const [n, setN] = useState(0); const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const on = (e: StorageEvent) => { if (!e.key || e.key === STATE_KEY || /workspace/.test(e.key)) setN((x) => x + 1); }; addEventListener('storage', on); const t = setInterval(() => setNow(Date.now()), 60_000); return () => { removeEventListener('storage', on); clearInterval(t); }; }, []);
  const st = useMemo<State>(() => loadState(), [n]); const w = useMemo<S.Workspace>(() => S.load(), [n]);
  return { st, w, now, refresh: () => { setN((x) => x + 1); setNow(Date.now()); } };
}
const opensFor = (role: RoleKey) => (href: string) => { const r = resolve(href.split('?')[0]!); return !!r && canOpen(role, r); };
export const SYNTHETIC_NOTE = 'Everyone here is synthetic. These addresses and numbers are fictional, so the app will not find them. With a connected directory the same buttons carry real addresses.';
const FRESH_TONE = { confirmed: 'ok', stale: 'warn', unknown: 'muted' } as const;
const AVAIL_TONE = { available: 'ok', busy: 'warn', 'off-shift': 'muted', 'off-hours': 'muted' } as const;
const AVAIL_WORD = { available: 'Working now', busy: 'Busy now', 'off-shift': 'Off shift', 'off-hours': 'Out of hours' } as const;

/** "Back to where I was", offered after a jump to another app when the person is somewhere else in the demonstration. */
export function ReturnBanner({ hash }: { hash: string }) {
  const [c, setC] = useState(() => returnContext());
  useEffect(() => { const on = () => { if (!document.hidden) setC(returnContext()); }; document.addEventListener('visibilitychange', on); return () => document.removeEventListener('visibilitychange', on); }, []);
  useEffect(() => { setC(returnContext()); }, [hash]);
  if (!c || c.from.split('?')[0] === (hash || '').split('?')[0]) return null;
  return <p className="cx-return" role="status" data-testid="connect-return">You opened {c.app} from another page{c.about ? ` (about ${c.about})` : ''}. <a href={c.from} onClick={() => forgetReturn()}>Back to where I was</a> <button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" onClick={() => { forgetReturn(); setC(null); }}>Dismiss</button></p>;
}

export interface BarProps { role: RoleKey; person: Person; /** what the contact is about, when it is about something */ about?: { kind: EntityKind; id: string } | null; /** what the person saw, in their own words, to carry into a message */ seen?: string | null; compact?: boolean; onChange?: () => void }
/**
 * The actions for one person. Drawn only for a role that may see the person's details; the jumps only for a role that may reach them.
 */
export function ContactBar({ role, person: p, about, seen, compact, onChange }: BarProps) {
  const { st, w, now, refresh } = useConnect(); const opens = opensFor(role);
  const [said, setSaid] = useState(''); const [fallback, setFallback] = useState<{ label: string; text: string } | null>(null); const [panel, setPanel] = useState<'' | 'avail' | 'backup'>(''); const fb = useRef<HTMLTextAreaElement>(null);
  const subject: Subject | null = about ? subjectOf(about.kind, about.id, w) : null;
  useEffect(() => { if (fallback) { fb.current?.focus(); fb.current?.select(); } }, [fallback]);
  if (!maySeeDetails(role, p)) return null;
  const reach = mayReach(role, p); const first = p.name.split(' ')[0]!; const msg = composeFor(role, p, subject, seen || null);
  const link = (id: string, input: JumpInput) => { const b = build(id, input); return b.ok ? b.href : null; };
  const chat = reach ? link('teams.chat', { to: [p.email], body: msg.body }) : null; const mail = reach ? link('mail.compose', { to: [p.email], subject: msg.subject, body: msg.body }) : null;
  const tel = reach ? link('phone.call', { phone: p.phone }) : null; const tcall = reach ? link('teams.call', { to: [p.email] }) : null;
  const here = typeof location === 'undefined' ? '' : location.hash;
  const jumped = (id: string) => { const out = recordJump(role, { jump: id, personId: p.id, about: about || null, from: here }); if ('why' in out) { setSaid(out.why.join(' ')); return; } rememberReturn({ at: new Date().toISOString(), app: out.app, jump: id, from: here, about: subject && subject.kind !== 'person' ? subject.label : p.name }); setFallback(null); setSaid(out.said); refresh(); onChange?.(); };
  const copy = async (what: 'email' | 'card') => {
    const text = what === 'email' ? p.email : cardOf(p); const label = what === 'email' ? `${first}’s email address` : `${first}’s contact card`;
    const refused = recordCopy(role, p.id, what); if (refused) { setSaid(refused.why.join(' ')); return; }
    try { if (!navigator.clipboard?.writeText) throw new Error('no clipboard'); await navigator.clipboard.writeText(text); setFallback(null); setSaid(`Copied ${label}${what === 'email' ? `: ${p.email}` : ''}.`); }
    catch { setFallback({ label, text }); setSaid(`This browser did not allow copying. ${label.charAt(0).toUpperCase()}${label.slice(1)} is selected below: copy it by hand.`); }
    refresh(); onChange?.();
  };
  const meetHref = `#/meet?with=${encodeURIComponent(p.id)}${about ? `&about=${encodeURIComponent(`${about.kind}:${about.id}`)}` : ''}${subject?.roomId ? `&room=${encodeURIComponent(subject.roomId)}` : ''}`;
  const B = buildingByKey(p.home); const where = `#/lite/b/${p.home}`; const backup = backupFor(p); const avail = availabilityAt(p, now, busyOf(st, w, role, p, now - DAY, now + DAY)); const fresh = freshnessOf(p, st.confirmed);
  const days = panel === 'avail' ? workingIn(p, now, now + 4 * DAY).slice(0, 3) : []; const busy = panel === 'avail' ? busyOf(st, w, role, p, now, now + 4 * DAY) : [];
  const row = ({ id, icon, label, what, href, onClick, ext, pressed }: { id: string; icon: IconName; label: string; what: string; href?: string; onClick?: () => void; ext?: boolean; pressed?: boolean }) => (
    <li key={id}>{href
      ? <a className="cx-act" href={href} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})} data-testid={`cx-${id}`} data-jump={jumpById(id) ? id : undefined} onClick={onClick}><CxIcon name={icon} /><span><b>{label}</b><span>{what}</span></span></a>
      : <button type="button" className="cx-act" data-testid={`cx-${id}`} aria-pressed={pressed} onClick={onClick}><CxIcon name={icon} /><span><b>{label}</b><span>{what}</span></span></button>}</li>);
  return (
    <div className={`cx-bar${compact ? ' cx-bar--compact' : ''}`} data-testid="contact-bar" data-person={p.id} data-reach={reach ? 'yes' : 'no'}>
      {!compact && <p className="cx-bar__who"><b>{p.name}</b> <span className="ui-muted">{p.title}{p.org ? ` · ${p.org}` : ''}</span> <Tag tone={AVAIL_TONE[avail.state]}>{AVAIL_WORD[avail.state]}</Tag> <Tag tone={FRESH_TONE[fresh.state]}>{fresh.state === 'confirmed' ? 'Entry confirmed' : fresh.state === 'stale' ? 'Entry stale' : 'Entry never confirmed'}</Tag></p>}
      <p className="cx-bar__avail" data-testid="cx-avail-line">{avail.words}.</p>
      <ul className="cx-acts" aria-label={`Ways to contact ${p.name}`}>
        {chat && row({ id: "teams.chat", icon: "chat", label: "Message in Teams", what: `Opens Teams to a chat with ${first}. You write and send it there.`, href: chat, ext: true, onClick: () => jumped('teams.chat') })}
        {mail && row({ id: "mail.compose", icon: "mail", label: "Send email", what: `Opens your email app with a message to ${first} started. You send it there.`, href: mail, onClick: () => jumped('mail.compose') })}
        {row({ id: "copy-email", icon: "copy", label: "Copy email", what: `Puts ${p.email} on this device’s clipboard.`, onClick: () => { void copy('email'); } })}
        {row({ id: "copy-card", icon: "card", label: "Copy contact card", what: "Name, role, address, number and working hours, as text.", onClick: () => { void copy('card'); } })}
        {tel && row({ id: "phone.call", icon: "phone", label: "Call", what: `Opens your phone app with ${p.phone} entered. You press call there.`, href: tel, onClick: () => jumped('phone.call') })}
        {tcall && row({ id: "teams.call", icon: "video", label: "Call in Teams", what: `Opens Teams ready to call ${first}. Teams asks you to confirm first.`, href: tcall, ext: true, onClick: () => jumped('teams.call') })}
        {maySchedule(role) && opens('#/meet') && row({ id: "schedule", icon: "calendar", label: "Schedule a meeting", what: "Finds times that suit you both. Nothing is booked until you review and confirm.", href: meetHref })}
        {row({ id: "availability", icon: "clock", label: "See availability", what: `${first}’s working hours and busy times (simulated calendar).`, pressed: panel === 'avail', onClick: () => setPanel(panel === 'avail' ? '' : 'avail') })}
        {!compact ? null : opens(`#/people/${p.id}`) && row({ id: "profile", icon: "person", label: "Open profile", what: `Who ${first} is and what they look after.`, href: `#/people/${p.id}` })}
        {opens(where) && row({ id: "location", icon: "place", label: "Open location", what: `${B?.name || p.home} in Lite, where ${first} is based.`, href: where })}
        {backup && maySeeDetails(role, backup) && row({ id: "backup", icon: "swap", label: "Find a backup contact", what: `Who to try when ${first} cannot be reached.`, pressed: panel === 'backup', onClick: () => setPanel(panel === 'backup' ? '' : 'backup') })}
      </ul>
      <p className="cx-said" role="status" aria-live="polite" data-testid="cx-said">{said}</p>
      {fallback && <div className="cx-fallback" data-testid="cx-fallback"><label htmlFor={`cx-fb-${p.id}`}>{fallback.label.charAt(0).toUpperCase()}{fallback.label.slice(1)}</label><textarea id={`cx-fb-${p.id}`} ref={fb} readOnly rows={fallback.text.includes('\n') ? 6 : 1} value={fallback.text} onFocus={(e) => e.target.select()} /></div>}
      {panel === 'avail' && <div className="cx-panel" data-testid="cx-availability">
        <p><b>{first} works {(p.shift || p.hours).start}–{(p.shift || p.hours).end}{p.shift ? ` (${p.shift.name.toLowerCase()})` : ''}</b>, {zoneCity(p.tz)} time.</p>
        <ul>{days.map((d) => { const b = busy.filter((x) => x.from < d.to && x.to > d.from); return <li key={d.from}><b>{fmtDay(p.tz, d.from)}</b> {fmtTime(p.tz, d.from)}–{fmtTime(p.tz, d.to)}{b.length ? <> · busy {b.map((x) => `${fmtTime(p.tz, x.from)}–${fmtTime(p.tz, x.to)}`).join(', ')}</> : ' · nothing in the calendar'}</li>; })}</ul>
        <p className="ui-meta">Times are {first}’s own. Simulated calendar: generated for the demonstration, not read from anyone’s diary. Public holidays and leave are not modelled.</p>
      </div>}
      {panel === 'backup' && backup && <div className="cx-panel" data-testid="cx-backup" data-person={backup.id}>
        <p><b>{backup.name}</b> <span className="ui-muted">{backup.title}</span></p>
        <p>{p.kind === 'role' ? `Another ${p.title.toLowerCase()} for the same building.` : p.kind === 'champion' ? `Stands in for ${first} at ${B?.name || p.home}.` : `The site champion ${first} stands in for.`} {availabilityAt(backup, now, busyOf(st, w, role, backup, now - DAY, now + DAY)).words}.</p>
        {opens(`#/people/${backup.id}`) && <p><a href={`#/people/${backup.id}`}>Open {backup.name.split(' ')[0]}’s profile and contact actions</a></p>}
      </div>}
      <p className="cx-synth ui-meta" data-testid="cx-synthetic">{SYNTHETIC_NOTE}</p>
    </div>
  );
}

const TITLE: Record<Exclude<EntityKind, 'person'>, string> = { room: 'Who knows this room?', building: 'Who to contact about this building', device: 'Who to contact about this equipment', issue: 'Who to contact about this job' };
/**
 * "Who knows this room?" — and the same for a building, a device and an issue. The site champion first (or the backup standing in,
 * with the reason), then the technician role, each with why they are listed. Drawn only for a role that may be told who to contact;
 * each person's actions only for a role that may see that person's details.
 */
export function WhoKnows({ role, kind, id, seen, heading }: { role: RoleKey; kind: Exclude<EntityKind, 'person'>; id: string; seen?: string | null; heading?: string }) {
  const { st, w, now } = useConnect(); const opens = opensFor(role); const [open, setOpen] = useState<string | null>(null);
  const subject = useMemo(() => subjectOf(kind, id, w), [kind, id, w]);
  const list: Contact[] = useMemo(() => (subject ? contactsFor(subject, now, w, (p) => busyOf(st, w, role, p, now - DAY, now + DAY)) : []), [subject, now, w, st, role]);
  if (!mayKnowWho(role) || !subject || !list.length) return null;
  const booked = subject.roomId ? meetingsInRoom(st, subject.roomId, now) : [];
  return (
    <section className="cx-who" aria-labelledby={`cx-who-${kind}-h`} data-testid="connect-who" data-kind={kind} data-id={id}>
      <h2 className="build__h" id={`cx-who-${kind}-h`}>{heading || TITLE[kind]}</h2>
      <ol className="cx-people">{list.map((c) => { const p = c.person; const details = maySeeDetails(role, p); return (
        <li key={p.id} data-person={p.id} data-relation={c.relation} data-available={c.availability.available ? 'yes' : 'no'}>
          <p className="cx-people__h"><b>{details && opens(`#/people/${p.id}`) ? <a href={`#/people/${p.id}`}>{p.name}</a> : p.name}</b> <Tag tone="info">{RELATION_WORD[c.relation]}</Tag> <Tag tone={AVAIL_TONE[c.availability.state]}>{AVAIL_WORD[c.availability.state]}</Tag></p>
          <p className="cx-people__why">{c.reason}.</p>
          {c.promoted && <p className="cx-people__promoted" data-testid="cx-promoted">{c.promoted}.</p>}
          {details
            ? <div className="cx-more"><button type="button" className="ui-btn ui-btn--sm" aria-expanded={open === p.id} aria-controls={`cx-more-${kind}-${p.id}`} data-testid="cx-open" onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? 'Hide the ways to contact' : 'Contact'} {p.name.split(' ')[0]}</button><div id={`cx-more-${kind}-${p.id}`}>{open === p.id && <ContactBar role={role} person={p} about={{ kind, id }} seen={seen} compact />}</div></div>
            : <p className="ui-meta" data-testid="cx-through">A {p.title.toLowerCase()} is reached through ServiceHands{opens('#/servicehands/new') ? <>: <a href="#/servicehands/new">report the problem</a> and it goes to the technician on shift</> : ''}.</p>}
        </li>); })}</ol>
      {booked.length > 0 && <p className="cx-booked" data-testid="cx-booked">This room is booked {booked.slice(0, 2).map((m) => `${fmtRange(list[0]!.person.tz, m.from, m.to)} (${m.id})`).join(' and ')}, {zoneCity(list[0]!.person.tz)} time, in this demonstration’s simulated calendar.</p>}
      <p className="ui-meta">Listed from the people directory: the person who knows the place first, then the role assigned to the work. Synthetic people.</p>
    </section>
  );
}
/** For a ServiceHands job address: the job's contacts. The job is read from the address, so the page needs one line to host this. */
export function WhoForJob({ hash, role }: { hash: string; role: string }) {
  const w = useMemo(() => S.load(), [hash]); const wo = /^#?\/?servicehands\/wo\/([^/?~]+)/.exec(hash)?.[1]; const q = /[?&]id=([^&~]+)/.exec(hash)?.[1];
  const id = wo ? S.workOrderOf(w, decodeURIComponent(wo))?.incidentId : q ? decodeURIComponent(q) : null;
  return id && S.incidentOf(w, id) ? <WhoKnows role={role as RoleKey} kind="issue" id={id} /> : null;
}
export { personById };
