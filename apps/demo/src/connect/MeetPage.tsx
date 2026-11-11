/**
 * #/meet — a meeting that fits everyone's working hours, shifts and time zones, recorded only after an explicit confirmation
 * (founder, 11 Nov 2026: "Meeting booking must be genuinely schedule-aware … require confirmation before sending invitations";
 * "Never silently book meetings"). Three steps on one page, in the address so a link reopens them: who and how long → the times that
 * fit, each with its reason and every attendee's own local time → a review of exactly what would be recorded, and Confirm.
 * At Confirm the time is checked again; if it was taken meanwhile nothing is recorded and the page says what took it.
 * The calendar is SIMULATED: the result says so, and that no invitation left this browser.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Card, Chip, EmptyState, Icon, Notice } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ALL_BUILDINGS, directory, localTime, personById, type Person } from './directory.js';
import { CAMPUS_ROOMS, buildingByKey, fullName, roomById, shortName } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { APPS, linkFor } from './apps.js';
import type { Proposal } from './calendar.js';
import { cancel, confirm, connectView, proposeFor, type Confirmation } from './store.js';

const newKey = () => { try { return crypto.randomUUID(); } catch { return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; } };
const mine = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const offsetIso = (iso: string) => iso.replace(/\.\d{3}Z$/, '+00:00');   // the Teams form wants the offset written out

export default function MeetPage({ role, query }: PageProps) {
  const { w, apply } = useWorkspace(); const all = useMemo(() => directory(w), [w]);
  const [ids, setIds] = useState<string[]>(() => (query.get('with') || '').split(',').filter((id) => personById(id, w)).slice(0, 12));
  const [roomId, setRoomId] = useState<string>(() => (roomById(query.get('room') || '') ? query.get('room')! : ''));
  const [minutes, setMinutes] = useState(() => ([15, 30, 45, 60, 90].includes(Number(query.get('mins'))) ? Number(query.get('mins')) : 30));
  const [pick, setPick] = useState<Proposal | null>(null); const [key, setKey] = useState(''); const [subject, setSubject] = useState(''); const [note, setNote] = useState('');
  const [refusal, setRefusal] = useState<string[] | null>(null); const [done, setDone] = useState<string | null>(null); const [add, setAdd] = useState('');
  const reviewRef = useRef<HTMLHeadingElement>(null); const alertRef = useRef<HTMLDivElement>(null);
  const attendees = ids.map((id) => personById(id, w)).filter(Boolean) as Person[]; const room = roomId ? roomById(roomId) : undefined;
  const [from] = useState(() => new Date());
  const res = useMemo(() => (attendees.length ? proposeFor(w, { attendees, roomId: roomId || null, minutes, from, days: 5 }) : null), [w, ids.join(','), roomId, minutes, from]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const q = new URLSearchParams(); if (ids.length) q.set('with', ids.join(',')); if (roomId) q.set('room', roomId); if (minutes !== 30) q.set('mins', String(minutes)); const h = `#/meet${q.toString() ? `?${q.toString().replace(/%2C/g, ',')}` : ''}`; if (location.hash !== h) history.replaceState(null, '', h); }, [ids, roomId, minutes]);
  useEffect(() => { if (pick) reviewRef.current?.focus(); }, [pick]); useEffect(() => { if (refusal) alertRef.current?.focus(); }, [refusal]);
  const choose = (p: Proposal) => { setPick(p); setKey(newKey()); setRefusal(null); setDone(null); if (!subject) setSubject(room ? `About ${shortName(room)}` : `With ${attendees.map((a) => a.name.split(' ')[0]).join(' and ')}`); };
  const change = (fn: () => void) => { fn(); setPick(null); setRefusal(null); };
  const state = connectView(w); const live = state.meetings.filter((m) => m.state === 'RECORDED');
  const send = () => { if (!pick) return; const c: Confirmation = { key, subject, attendeeIds: ids, roomId: roomId || null, start: pick.start, end: pick.end, note };
    const r = apply((n) => confirm(n, role, c)); if (r && 'why' in r) { setRefusal(r.why); setDone(null); if (r.why.some((x) => /no longer free|has passed/.test(x))) setPick(null); return; }
    setRefusal(null); setDone((r as { id: string }).id); setPick(null); };
  const made = done ? state.meetings.find((m) => m.id === done) : undefined;
  const teams = made ? linkFor('teams.meeting', { users: made.attendees.map((id) => personById(id, w)?.upn || '').filter(Boolean), subject: made.subject, startTime: offsetIso(made.start), endTime: offsetIso(made.end), content: note }) : null;

  return (
    <div className="pa cn" data-native="" data-testid="meet">
      <PageHero compact eyebrow="Search Party · meet" title="Find a time that works for everyone" product="search-party" icon="calendar" lede="Inside each person’s working hours and shift, in their own time zone, clear of what they already have, with the room free. Nothing is recorded until you confirm."
        meta={[<Chip key="s" small tone="warn">Simulated calendar</Chip>, <Chip key="n" small tone="muted">No invitation leaves this browser</Chip>]} />

      <Card title="Who, where, how long" icon="users" testId="meet-ask">
        <ul className="cn-chips" data-testid="meet-people">{attendees.map((p) => <li key={p.id} data-person={p.id}><a href={`#/people/${p.id}`}>{p.name}</a><span>{p.title} · {p.tz.split('/')[1]!.replace(/_/g, ' ')}</span><button type="button" className="ui-btn ui-btn--sm" aria-label={`Remove ${p.name}`} onClick={() => change(() => setIds(ids.filter((x) => x !== p.id)))}>Remove</button></li>)}</ul>
        {!attendees.length ? <p className="cn-note">Choose who to meet.</p> : null}
        <div className="cn-find">
          <div className="ui-field"><label htmlFor="meet-add">Add a person</label><select id="meet-add" value={add} onChange={(e) => { const id = e.target.value; if (id && !ids.includes(id) && ids.length < 12) change(() => setIds([...ids, id])); setAdd(''); }} data-testid="meet-add"><option value="">Choose…</option>{all.filter((p) => !ids.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.title}</option>)}</select></div>
          <div className="ui-field"><label htmlFor="meet-room">Room</label><select id="meet-room" value={roomId} onChange={(e) => change(() => setRoomId(e.target.value))} data-testid="meet-room"><option value="">No room (online)</option>{ALL_BUILDINGS.map((b) => <optgroup key={b.key} label={b.name}>{CAMPUS_ROOMS.filter((r) => r.building === b.key).map((r) => <option key={r.id} value={r.id}>{fullName(r)}</option>)}</optgroup>)}</select></div>
          <div className="ui-field"><label htmlFor="meet-mins">Length</label><select id="meet-mins" value={minutes} onChange={(e) => change(() => setMinutes(Number(e.target.value)))} data-testid="meet-mins">{[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select></div>
        </div>
      </Card>

      {refusal ? <div ref={alertRef} tabIndex={-1} role="alert" className="cn-msg cn-msg--no" data-testid="meet-refused"><Icon name="alert" size={18} /><span>{refusal.join(' ')}</span></div> : null}

      {made ? <section className="cn-done" data-testid="meet-done" data-meeting={made.id} aria-labelledby="meet-done-h">
        <h2 id="meet-done-h"><Icon name="check" size={20} /> Recorded as {made.id}</h2>
        <p><b>{made.subject}</b> · {mine(made.start)} (your time){made.roomId && roomById(made.roomId) ? ` · ${shortName(roomById(made.roomId)!)}` : ' · online'}</p>
        <p>It is recorded in this demonstration’s simulated calendar, and the room is held. <b>No invitation left this browser</b> and nobody has been told: with a connected calendar this is where the invitation would be created, once.</p>
        {teams ? <p><a className="ui-btn" href={teams} target="_blank" rel="noopener noreferrer" data-app="teams.meeting" title={APPS['teams.meeting'].opens}>{APPS['teams.meeting'].label}</a> <span className="cn-note">{APPS['teams.meeting'].opens}</span></p> : null}
      </section> : null}

      {attendees.length && !made ? <section className="cn-sec" aria-labelledby="meet-times-h"><h2 id="meet-times-h">Times that fit</h2>
        {res && res.ok ? <ol className="cn-times" data-testid="meet-times">{res.proposals.map((p) => (
          <li key={p.start} data-start={p.start} data-picked={pick?.start === p.start ? 'yes' : 'no'}>
            <div><b>{mine(p.start)}</b> <span className="cn-note">your time · {minutes} minutes</span><p>{p.reason}.</p>
              <ul className="cn-local">{p.local.map((l) => { const x = personById(l.personId, w)!; return <li key={l.personId}><b>{l.label}</b> for {x.name}</li>; })}</ul></div>
            <button type="button" className={`ui-btn${pick?.start === p.start ? ' ui-btn--primary' : ''}`} aria-pressed={pick?.start === p.start} onClick={() => choose(p)} data-act="choose">{pick?.start === p.start ? 'Chosen' : 'Choose'}</button>
          </li>))}</ol>
          : res ? <div data-testid="meet-none"><EmptyState title={res.why} icon="calendar"><ul className="cn-tried">{res.tried.map((t) => <li key={t}>{t}</li>)}</ul></EmptyState></div> : null}
        {res ? <p className="cn-note">Read from the {res.provenance.toLowerCase()} calendar: {res.checked} possible starts over five days were checked.</p> : null}
      </section> : null}

      {pick ? <section className="cn-review" data-testid="meet-review" aria-labelledby="meet-review-h">
        <h2 id="meet-review-h" tabIndex={-1} ref={reviewRef}>Review, then confirm</h2>
        <dl className="cn-kv"><div><dt>When</dt><dd>{mine(pick.start)} (your time), {minutes} minutes<ul className="cn-local">{pick.local.map((l) => { const x = personById(l.personId, w)!; return <li key={l.personId}><b>{l.label}</b> for {x.name} ({localTime(x.tz, new Date(pick.end)).hhmm} when it ends)</li>; })}</ul></dd></div>
          <div><dt>Who</dt><dd>{attendees.map((a) => `${a.name} (${a.title})`).join('; ')}</dd></div>
          <div><dt>Where</dt><dd>{room ? `${fullName(room)}, ${buildingByKey(room.building)?.name}` : 'Online'}</dd></div></dl>
        <div className="ui-field"><label htmlFor="meet-subject">What it is about</label><input id="meet-subject" type="text" maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="meet-subject" /></div>
        <div className="ui-field"><label htmlFor="meet-note">A note for the people invited (optional)</label><textarea id="meet-note" rows={2} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} data-testid="meet-note" /></div>
        <div className="cn-actions"><button type="button" className="ui-btn ui-btn--primary" onClick={send} data-testid="meet-confirm">Confirm and record</button><button type="button" className="ui-btn" onClick={() => setPick(null)}>Choose another time</button></div>
        <p className="cn-note">Confirming checks the time once more. If someone or the room was taken meanwhile, nothing is recorded and you are shown new times.</p>
      </section> : null}

      {live.length ? <section className="cn-sec" aria-labelledby="meet-list-h"><h2 id="meet-list-h">Recorded here</h2>
        <ul className="cn-list" data-testid="meet-list">{live.map((m) => <li key={m.id} data-meeting={m.id}><span><b>{m.subject}</b><span>{m.id} · {mine(m.start)} · {m.attendees.map((id) => personById(id, w)?.name || id).join(', ')}{m.roomId && roomById(m.roomId) ? ` · ${shortName(roomById(m.roomId)!)}` : ''} · by the {m.by}</span></span>
          <button type="button" className="ui-btn ui-btn--sm" data-act="cancel" onClick={() => { const r = apply((n) => cancel(n, role, m.id)); if (r && 'why' in r) setRefusal(r.why); else { setRefusal(null); if (done === m.id) setDone(null); } }}>Cancel</button></li>)}</ul></section> : null}

      <Notice tone="info"><b>What is simulated.</b> The people, their calendars and the room bookings are invented and deterministic. The same steps, checks and confirmation run against a connected calendar; that connection is written and tested against a mock, and has not been validated with a real tenant.</Notice>
    </div>
  );
}
