/**
 * #/meet — the meeting assistant. Four steps, one at a time: who and what, when (ranked times, each with its reason and each
 * person's own clock), review (who, when in every zone, where, and what an invitation would say), and the record.
 *
 * Nothing is booked by proposing, by asking Ask Empathia, or by arriving here from a link: a meeting exists only after the person
 * presses Confirm on the review step, and at that moment the calendar is read again. The request lives in the address, so a reload
 * or a shared link reopens the same step; the confirmation carries a key, so pressing twice, reloading or a second tab makes one
 * meeting. The calendar is SIMULATED and the page says so; the result says exactly what was recorded and that nothing was sent.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Button, Notice, Tag, Field, Segmented } from '@empathia/ui';
import type { PageProps, RoleKey } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { roomById, shortName } from '../campus/canon.js';
import { findRooms } from '../here/model.js';
import { DURATIONS, conflictsAt, type Slot } from './calendar.js';
import { CONNECTION_STATEMENT } from './adapter.js';
import { build, jumpById } from './apps.js';
import { findPeople, people, personById, subjectOf, type EntityKind } from './directory.js';
import { mayReach, maySchedule, maySeeDetails } from './access.js';
import { ReturnBanner, useConnect } from './ContactBar.js';
import { MAX_ATTENDEES, RECORDED_STATEMENT, SEARCH_DAYS, cancelMeeting, confirm, defaultSubject, invitationText, keyFor, meetingsOf, organiserOf, proposeFor, recordJump, type MeetInput, type Meeting, type Plan } from './store.js';
import { fmtDay, fmtRange, isoDay, isoLocal, utcOffset, zoneCity } from './time.js';

type StepId = 'who' | 'when' | 'review' | 'done';
const STEPS: StepId[] = ['who', 'when', 'review', 'done'];
const STEP_TITLE: Record<StepId, [string, string]> = { who: ['Who and what', 'Who are you meeting, and about what?'], when: ['Pick a time', 'Times that work'], review: ['Review', 'Review before anything is recorded'], done: ['Recorded', 'Recorded'] };
const SUBJECT_KEY = 'empathia.demo.connect.subject.v1';
const list = (s: string | null) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);
const opensFor = (role: RoleKey) => (href: string) => { const r = resolve(href.split('?')[0]!); return !!r && canOpen(role, r); };

/** The request, read from the address (so a link or a reload reopens it). */
function readInput(query: URLSearchParams, subject: string): MeetInput {
  const about = (query.get('about') || '').split(':'); const kind = (['room', 'building', 'device', 'issue'] as EntityKind[]).find((k) => k === about[0]); const min = Number(query.get('min'));
  return { withIds: list(query.get('with')), optionalIds: list(query.get('opt')), roomId: query.get('room') || null, minutes: (DURATIONS as readonly number[]).includes(min) ? min : 30, fromDay: /^\d{4}-\d{2}-\d{2}$/.test(query.get('day') || '') ? query.get('day') : null, subject, about: kind && about[1] ? { kind, id: about.slice(1).join(':') } : null };
}
function writeAddress(i: MeetInput, step: StepId, slot: number | null, id: string | null) {
  const q = new URLSearchParams(); if (i.withIds.length) q.set('with', i.withIds.join(',')); if (i.optionalIds.length) q.set('opt', i.optionalIds.join(',')); if (i.roomId) q.set('room', i.roomId); if (i.about) q.set('about', `${i.about.kind}:${i.about.id}`);
  if (i.minutes !== 30) q.set('min', String(i.minutes)); if (i.fromDay) q.set('day', i.fromDay); q.set('step', step); if (slot && (step === 'review')) q.set('slot', String(slot)); if (id && step === 'done') q.set('id', id);
  try { history.replaceState(null, '', `#/meet?${q}`); } catch { /* the address stays */ }
}

/** A real navigation to #/meet (a link, Back, a typed address) starts the page afresh from that address; the page's own address updates do not. */
export default function MeetPage(props: PageProps) { return <Meet key={props.hash} {...props} />; }
function Meet({ role, query, hash }: PageProps) {
  const { st, w, refresh } = useConnect(); const opens = opensFor(role); const me = useMemo(() => organiserOf(role), [role]);
  const [input, setInput] = useState<MeetInput>(() => { let s = ''; try { s = sessionStorage.getItem(SUBJECT_KEY) || ''; } catch { /* none */ } return readInput(query, s); });
  const want = query.get('step') as StepId | null; const wantSlot = Number(query.get('slot')) || null; const wantId = query.get('id');
  const [step, setStepRaw] = useState<StepId>(() => (want === 'done' && wantId ? 'done' : want === 'review' && wantSlot && input.withIds.length ? 'review' : want === 'when' && input.withIds.length ? 'when' : 'who'));
  const [slot, setSlot] = useState<number | null>(wantSlot); const [doneId, setDoneId] = useState<string | null>(wantId); const [nowAt, setNowAt] = useState(() => Date.now());
  const [refused, setRefused] = useState<string[] | null>(null); const [said, setSaid] = useState(''); const [again, setAgain] = useState(false); const [find, setFind] = useState(''); const [roomText, setRoomText] = useState(''); const [reason, setReason] = useState('');
  const head = useRef<HTMLHeadingElement>(null); const moved = useRef(false);

  useEffect(() => { writeAddress(input, step, slot, doneId); }, [input, step, slot, doneId]);
  useEffect(() => { try { sessionStorage.setItem(SUBJECT_KEY, input.subject); } catch { /* not kept */ } }, [input.subject]);
  useEffect(() => { if (moved.current) { head.current?.focus({ preventScroll: true }); head.current?.scrollIntoView?.({ block: 'nearest' }); } }, [step]);
  const go = (to: StepId) => { moved.current = true; setRefused(null); setSaid(''); if (to === 'when') setNowAt(Date.now()); setStepRaw(to); };
  const change = (patch: Partial<MeetInput>) => { setInput((i) => ({ ...i, ...patch })); setRefused(null); };

  const chosen = input.withIds.map((id) => personById(id)).filter((p): p is NonNullable<typeof p> => !!p && maySeeDetails(role, p));
  const candidates = useMemo(() => (find.trim().length >= 2 ? findPeople(find, 30) : people().filter((p) => p.kind === 'champion').slice(0, 6)).filter((p) => maySeeDetails(role, p) && !input.withIds.includes(p.id) && p.id !== me.id).slice(0, 6), [find, input.withIds, role, me.id]);
  const rooms = useMemo(() => (roomText.trim() ? findRooms(roomText, 5) : []), [roomText]); const room = input.roomId ? roomById(input.roomId) : null;
  const about = input.about ? subjectOf(input.about.kind, input.about.id, w) : null;
  // proposing reads only; it is re-run whenever the request changes or the person comes back to this step
  const plan = useMemo<Plan | { why: string[] } | null>(() => (step === 'when' || step === 'review' ? proposeFor(role, input, nowAt, st, w) : null), [step, role, input, nowAt, st, w]);
  const planOk = plan && !('why' in plan) ? plan : null;
  const picked: Slot | null = planOk && slot ? planOk.proposal.slots.find((s) => s.from === slot) || null : null;
  const reviewSlot = slot ? { from: slot, to: slot + input.minutes * 60_000 } : null;
  const tzOf = (id: string) => planOk?.ask.attendees.find((c) => c.id === id)?.tz || me.tz;
  const done: Meeting | null = doneId ? st.meetings.find((m) => m.id === doneId) || null : null;
  // While a review is open the calendar is still watched: if another tab (or anyone) takes the time, the review is withdrawn rather
  // than left looking confirmable; if this very request was already recorded elsewhere, the page says so instead of offering it again.
  const already = step === 'review' && reviewSlot ? st.meetings.find((m) => m.state === 'RECORDED' && m.transactionId === keyFor(role, input, reviewSlot)) || null : null;
  const taken = step === 'review' && planOk && reviewSlot && !already ? conflictsAt(planOk.ask, reviewSlot.from, reviewSlot.to) : [];

  const doConfirm = () => {
    if (!reviewSlot) return; const out = confirm(role, input, reviewSlot, keyFor(role, input, reviewSlot), Date.now());
    if ('why' in out) { setRefused(out.why); setSaid(''); refresh(); head.current?.focus(); return; }
    moved.current = true; setRefused(null); setAgain(out.again); setSaid(out.said); setDoneId(out.meeting.id); setStepRaw('done'); refresh();
  };
  const doCancel = (id: string) => { const out = cancelMeeting(role, id, reason, Date.now()); if ('why' in out) setRefused(out.why); else { setRefused(null); setReason(''); setSaid(`${out.id} is cancelled in this demonstration’s simulated calendar. No cancellation left this browser.`); } refresh(); };
  const teamsForm = (m: Meeting) => { const others = m.parties.filter((x) => x.id !== me.id).map((x) => personById(x.id)).filter((p): p is NonNullable<typeof p> => !!p); if (!others.length || !others.every((p) => mayReach(role, p))) return null; const b = build('teams.meeting', { to: others.map((p) => p.email), subject: m.subject, body: m.body, from: isoLocal(me.tz, m.from), until: isoLocal(me.tz, m.to) }); return b.ok ? { href: b.href, first: others[0]! } : null; };
  const mine = meetingsOf(st, role);

  if (!maySchedule(role)) return null;
  const n = STEPS.indexOf(step);
  return (
    <section className="cx cx-meet" data-native="" data-testid="meet-page" data-step={step} data-slot={slot || ''} data-meeting={doneId || ''}>
      <PageHero compact eyebrow="Meeting assistant" icon="calendar" product="search-party" title="Schedule a meeting" lede="Find a time that suits everyone’s working hours, shifts and time zones, and the room. Nothing is recorded until you review it and confirm."
        meta={[<Tag key="s" tone="warn">Simulated calendar</Tag>, <Tag key="p" tone="warn">Synthetic people</Tag>, <span key="r">You are the {ROLES[role].label}{me.id.startsWith('you-') ? '' : `, as ${me.name}`}</span>]} />
      <ReturnBanner hash={hash} />
      <nav aria-label="Steps to a meeting"><ol className="hr-rail cx-rail" data-testid="meet-rail">{STEPS.map((s, i) => <li key={s} className={s === step ? 'on' : i < n ? 'done' : ''}>
        <button type="button" aria-current={s === step ? 'step' : undefined} disabled={s === 'done' || (s !== 'who' && !input.withIds.length) || (s === 'review' && !slot) || step === 'done'} onClick={() => go(s)} data-testid={`meet-step-${s}`}><span className="hr-rail__n" aria-hidden="true">{i + 1}</span>{STEP_TITLE[s][0]}</button></li>)}</ol></nav>

      {step === 'who' && <div className="cx-step" data-testid="meet-who">
        <h2 className="build__h" tabIndex={-1} ref={head}>{STEP_TITLE.who[1]}</h2>
        {about && <p className="cx-about" data-testid="meet-about">About <b>{about.label}</b>{about.href && opens(about.href) ? <> · <a href={about.href}>open it</a></> : null} <button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" onClick={() => change({ about: null })}>Remove</button></p>}
        <h3 className="cx-h3">People</h3>
        <ul className="cx-chosen" data-testid="meet-chosen"><li data-person={me.id}><b>{me.name}</b> <span className="ui-meta">organiser · {zoneCity(me.tz)} time{me.id.startsWith('you-') ? ' · office hours 08:00–17:00 assumed for this role' : ''}</span></li>
          {chosen.map((p) => <li key={p.id} data-person={p.id}><b>{p.name}</b> <span className="ui-meta">{p.title} · {zoneCity(p.tz)} time{p.shift ? ` · ${p.shift.name.toLowerCase()}` : ''}</span>
            <label className="cx-opt"><input type="checkbox" checked={input.optionalIds.includes(p.id)} onChange={(e) => change({ optionalIds: e.target.checked ? [...input.optionalIds, p.id] : input.optionalIds.filter((x) => x !== p.id) })} /> optional</label>
            <button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" onClick={() => change({ withIds: input.withIds.filter((x) => x !== p.id), optionalIds: input.optionalIds.filter((x) => x !== p.id) })} aria-label={`Remove ${p.name}`}>Remove</button></li>)}</ul>
        {chosen.length < MAX_ATTENDEES && <>
          <Field label="Add a person" hint="A name, a role or a building. Only people whose calendar this role may see are offered.">{(fid, by) => <input id={fid} aria-describedby={by} type="search" autoComplete="off" value={find} maxLength={60} onChange={(e) => setFind(e.target.value)} data-testid="meet-find" />}</Field>
          <ul className="cx-offer" data-testid="meet-offer" aria-live="polite">{candidates.map((p) => <li key={p.id}><button type="button" className="cx-pick" onClick={() => { change({ withIds: [...input.withIds, p.id] }); setFind(''); }} data-person={p.id}><b>{p.name}</b><span>{p.title} · {zoneCity(p.tz)}</span></button></li>)}
            {find.trim().length >= 2 && !candidates.length && <li className="ui-muted">Nobody this role may schedule with matches “{find.trim()}”.</li>}</ul>
        </>}
        <h3 className="cx-h3">Room</h3>
        {room ? <p data-testid="meet-room" data-room={room.id}><b>{shortName(room)} — {room.name}</b> <button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" onClick={() => change({ roomId: null })}>Meet without a room</button></p>
          : <><Field label="A room (optional)" hint="Leave empty for an online meeting.">{(fid, by) => <input id={fid} aria-describedby={by} type="search" autoComplete="off" value={roomText} onChange={(e) => setRoomText(e.target.value)} data-testid="meet-roomfind" />}</Field>
            {rooms.length > 0 && <ul className="cx-offer">{rooms.map((o) => <li key={o.id}><button type="button" className="cx-pick" onClick={() => { change({ roomId: o.id }); setRoomText(''); }} data-room={o.id}><b>{shortName(o)}</b><span>{o.name}</span></button></li>)}</ul>}</>}
        <div className="cx-row">
          <div><h3 className="cx-h3" id="cx-len-h">Length</h3><Segmented label="Length of the meeting" value={String(input.minutes)} onChange={(v) => change({ minutes: Number(v) })} options={DURATIONS.map((d) => ({ value: String(d), label: `${d} min` }))} /></div>
          <Field label="From which day" hint={`The next ${SEARCH_DAYS} days are searched from here.`}>{(fid, by) => <input id={fid} aria-describedby={by} type="date" min={isoDay(me.tz, Date.now())} value={input.fromDay || ''} onChange={(e) => change({ fromDay: e.target.value || null })} data-testid="meet-day" />}</Field>
        </div>
        <Field label="Subject" hint="What the invitation would be called.">{(fid, by) => <input id={fid} aria-describedby={by} value={input.subject} maxLength={120} placeholder={defaultSubject(input, w)} onChange={(e) => change({ subject: e.target.value })} data-testid="meet-subject" />}</Field>
        <div className="hr-nav"><Button kind="primary" disabled={!chosen.length} onClick={() => go('when')} testId="meet-next">Find times</Button></div>
        {!chosen.length && <p className="ui-muted">Add at least one person to look for a time.</p>}
      </div>}

      {step === 'when' && <div className="cx-step" data-testid="meet-when" data-slots={planOk?.proposal.slots.length ?? 0}>
        <h2 className="build__h" tabIndex={-1} ref={head}>{planOk && !planOk.proposal.slots.length ? 'No time works for everyone' : STEP_TITLE.when[1]}</h2>
        {plan && 'why' in plan && <div data-testid="meet-refused"><Notice tone="bad"><ul>{plan.why.map((x) => <li key={x}>{x}</li>)}</ul></Notice></div>}
        {planOk && planOk.proposal.slots.length > 0 && <>
          <p className="ui-muted">{planOk.subject} · {input.minutes} minutes · between {fmtDay(me.tz, planOk.from)} and {fmtDay(me.tz, planOk.to - 1)}. Times are shown on your clock first ({zoneCity(me.tz)}, {utcOffset(me.tz, planOk.from)}).</p>
          <ol className="cx-slots" data-testid="meet-slots">{planOk.proposal.slots.map((s, i) => (
            <li key={s.from}><button type="button" className={`cx-slot${slot === s.from ? ' on' : ''}`} aria-pressed={slot === s.from} onClick={() => setSlot(s.from)} data-testid="meet-slot" data-from={s.from} data-without={s.without.length}>
              <b>{fmtRange(me.tz, s.from, s.to)}</b>{i === 0 && <Tag tone="ok">Earliest that suits everyone</Tag>}
              <span className="cx-slot__why">{s.reason}.</span>
              <span className="cx-slot__local">{s.local.filter((l) => l.id !== me.id).map((l) => <span key={l.id}>{l.name}{l.optional ? ' (optional)' : ''}: {l.text}</span>)}</span>
            </button></li>))}</ol>
          <div className="hr-nav"><Button kind="quiet" onClick={() => go('who')} testId="meet-back">Back</Button><Button kind="primary" disabled={!picked} onClick={() => go('review')} testId="meet-review">Review this time</Button></div>
        </>}
        {planOk && !planOk.proposal.slots.length && <div data-testid="meet-none">
          <ul className="cx-facts">{planOk.proposal.none?.lines.map((x) => <li key={x}>{x}</li>)}</ul>
          {planOk.alternatives.length > 0 ? <><h3 className="cx-h3">What would work</h3><ul className="cx-offer" data-testid="meet-alternatives">{planOk.alternatives.map((a) => <li key={`${a.kind}:${a.label}`}><button type="button" className="cx-pick" data-kind={a.kind} onClick={() => { setSlot(null); setNowAt(Date.now());
            change({ ...(a.change.minutes ? { minutes: a.change.minutes } : {}), ...(a.change.from ? { fromDay: isoDay(me.tz, a.change.from) } : {}), ...(a.change.dropRoom ? { roomId: null } : {}), ...(a.change.swap ? { withIds: input.withIds.map((x) => (x === a.change.swap!.out ? a.change.swap!.in : x)) } : {}), ...(a.change.optional ? { optionalIds: [...input.optionalIds, a.change.optional] } : {}) }); }}><b>{a.label}</b><span>{a.slots} time{a.slots === 1 ? '' : 's'} would then work</span></button></li>)}</ul></>
            : <p>None of the usual changes produces a time either: a shorter meeting, the following days, or a backup contact. Ask each person directly.</p>}
          <div className="hr-nav"><Button kind="quiet" onClick={() => go('who')} testId="meet-back">Change who or what</Button></div>
        </div>}
        <p className="ui-meta">Proposed by the same rule every time: inside each person’s working hours or shift in their own time zone (daylight-saving changes included), clear of their busy time and of the room’s bookings. Public holidays and leave are not modelled.</p>
      </div>}

      {step === 'review' && <div className="cx-step" data-testid="meet-review-step">
        <h2 className="build__h" tabIndex={-1} ref={head}>{STEP_TITLE.review[1]}</h2>
        {refused && <div data-testid="meet-conflict"><Notice tone="bad"><b>Not recorded.</b> Something changed since this time was proposed:<ul>{refused.map((x) => <li key={x}>{x}</li>)}</ul></Notice><p><Button kind="primary" onClick={() => { setSlot(null); go('when'); }} testId="meet-repropose">See the times that work now</Button></p></div>}
        {already && !refused && <div data-testid="meet-already"><Notice tone="info"><b>This meeting is already recorded as {already.id}.</b> Nothing will be recorded a second time.</Notice><p><a className="ui-btn ui-btn--primary" href={`#/meet?step=done&id=${already.id}`}>Open {already.id}</a></p></div>}
        {taken.length > 0 && !refused && <div data-testid="meet-withdrawn"><Notice tone="warn"><b>This time is no longer free, so it is not offered for confirmation.</b> Since you chose it:<ul>{taken.map((c) => <li key={`${c.kind}:${c.id}`}>{c.detail}</li>)}</ul></Notice><p><Button kind="primary" onClick={() => { setSlot(null); go('when'); }} testId="meet-repropose">See the times that work now</Button></p></div>}
        {planOk && reviewSlot && !refused && !already && !taken.length && <>
          <dl className="hr-rec cx-review" data-testid="meet-summary">
            <div><dt>Subject</dt><dd>{planOk.subject}</dd></div>
            <div><dt>Who</dt><dd><ul>{planOk.parties.map((x) => <li key={x.id}>{x.name}{x.id === me.id ? ' (organiser)' : ''}{x.optional ? ' (optional)' : ''}</li>)}</ul></dd></div>
            <div><dt>When</dt><dd><ul data-testid="meet-zones">{planOk.parties.map((x) => <li key={x.id} data-person={x.id}><b>{fmtRange(tzOf(x.id), reviewSlot.from, reviewSlot.to)}</b> for {x.id === me.id ? 'you' : x.name} · {zoneCity(tzOf(x.id))} ({utcOffset(tzOf(x.id), reviewSlot.from)})</li>)}</ul></dd></div>
            <div><dt>Where</dt><dd>{planOk.room ? planOk.room.name : 'No room: an online meeting'}</dd></div>
            {planOk.about && <div><dt>About</dt><dd>{planOk.about.label}</dd></div>}
            {picked && <div><dt>Why this time</dt><dd>{picked.reason}.</dd></div>}
          </dl>
          <h3 className="cx-h3">What the invitation would say</h3>
          <pre className="cx-invite" data-testid="meet-invite">{invitationText({ subject: planOk.subject, parties: planOk.parties, room: planOk.room, from: reviewSlot.from, to: reviewSlot.to, about: planOk.about, organiser: me }, tzOf)}</pre>
          <Notice tone="info">Nothing is recorded yet. Confirming records this meeting in the demonstration’s simulated calendar and books the room in the shared workspace. No invitation is sent to anyone.</Notice>
          <div className="hr-nav"><Button kind="quiet" onClick={() => go('when')} testId="meet-back">Back to the times</Button><Button kind="primary" onClick={doConfirm} testId="meet-confirm">Confirm and record this meeting</Button></div>
        </>}
        {plan && 'why' in plan && !refused && <div data-testid="meet-refused"><Notice tone="bad"><ul>{plan.why.map((x) => <li key={x}>{x}</li>)}</ul></Notice></div>}
      </div>}

      {step === 'done' && <div className="cx-step hr-done" data-testid="meet-done" data-state={done?.state || 'missing'} data-again={again ? 'yes' : 'no'}>
        <h2 className="build__h" tabIndex={-1} ref={head}>{done ? (done.state === 'CANCELLED' ? `${done.id} is cancelled` : `Recorded as ${done.id}`) : 'That meeting is not recorded here'}</h2>
        {done ? <>
          <p data-testid="meet-statement"><b>{done.state === 'CANCELLED' ? 'Cancelled in this demonstration’s simulated calendar. No cancellation left this browser.' : RECORDED_STATEMENT}</b></p>
          {again && <Notice tone="info">This meeting was already recorded. Nothing was recorded a second time.</Notice>}
          <p>{done.subject} · {fmtRange(me.tz, done.from, done.to)} {zoneCity(me.tz)} time · {done.parties.map((x) => x.name).join(', ')}{done.room ? ` · ${done.room.name}` : ''}.</p>
          {done.state === 'RECORDED' && (() => { const t = teamsForm(done); const j = jumpById('teams.meeting'); return t && j ? <p className="cx-next"><a className="ui-btn" href={t.href} target="_blank" rel="noopener noreferrer" data-testid="meet-teams" data-jump="teams.meeting" onClick={() => { const out = recordJump(role, { jump: 'teams.meeting', personId: t.first.id, about: input.about, from: location.hash }); setSaid('why' in out ? out.why.join(' ') : out.said); refresh(); }}>Open Teams’ scheduling form with this filled in</a><span className="ui-meta">To invite people for real you send it yourself, from Teams: this opens Teams’ own form with the time, people and subject filled in. Nobody is invited until you press Send there. These people are synthetic, so Teams will not find them.</span></p> : null; })()}
          {done.state === 'RECORDED' && done.organiser.role === role && <div className="cx-form" data-testid="meet-cancel-form"><Field label="Cancel this meeting" hint="A reason is optional.">{(fid, by) => <input id={fid} aria-describedby={by} value={reason} maxLength={160} onChange={(e) => setReason(e.target.value)} data-testid="meet-cancel-reason" />}</Field><Button kind="danger" onClick={() => doCancel(done.id)} testId="meet-cancel">Cancel {done.id}</Button></div>}
          {refused && <div data-testid="meet-refused"><Notice tone="bad"><ul>{refused.map((x) => <li key={x}>{x}</li>)}</ul></Notice></div>}
          <p className="hr-links">{done.about && (() => { const s = subjectOf(done.about.kind, done.about.id, w); return s?.href && opens(s.href) ? <a href={s.href}>Back to {s.label}</a> : null; })()}{done.room && opens('#/pro/ops') && <a href="#/pro/ops">See the room’s booking in the Operations Hub</a>}<a href="#/meet" data-testid="meet-another">Schedule another</a></p>
        </> : <p>It may have been made in another browser, or the demonstration was reset. <a href="#/meet">Schedule a meeting</a></p>}
      </div>}
      <p className="cx-said" role="status" aria-live="polite" data-testid="meet-said">{said}</p>

      {mine.length > 0 && <section className="cx-mine" aria-labelledby="cx-mine-h" data-testid="meet-mine" data-count={mine.length} data-live={mine.filter((m) => m.state === 'RECORDED').length}><h2 className="build__h" id="cx-mine-h">Meetings you recorded here</h2>
        <ul>{mine.slice(0, 8).map((m) => <li key={m.id} data-id={m.id} data-state={m.state}><span><b>{m.subject}</b> <span className="ui-muted">{m.id} · {fmtRange(me.tz, m.from, m.to)} · {m.parties.filter((x) => x.id !== me.id).map((x) => x.name).join(', ')}{m.room ? ` · ${m.room.name}` : ''}</span></span> <Tag tone={m.state === 'RECORDED' ? 'ok' : 'muted'}>{m.state === 'RECORDED' ? 'Recorded' : 'Cancelled'}</Tag>
          {m.state === 'RECORDED' && m.id !== doneId && <a className="ui-btn ui-btn--sm" href={`#/meet?step=done&id=${m.id}`}>Open</a>}</li>)}</ul>
        <p className="ui-meta">Kept in this browser. Each is a record in the simulated calendar; none was sent to anyone.</p>
      </section>}

      <details className="cx-truth" data-testid="meet-truth"><summary>Is this connected to Microsoft 365?</summary>
        <p>{CONNECTION_STATEMENT}</p>
        <p className="ui-meta">What a connected calendar needs — permissions, test accounts, devices and the validation steps — is written down in the deployment and testing guide (docs/surpass/M365_DEPLOYMENT_AND_TEST_GUIDE.md).</p>
      </details>
    </section>
  );
}
