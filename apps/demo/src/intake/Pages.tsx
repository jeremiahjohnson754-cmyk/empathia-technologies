/**
 * The Intake pages other than the front door and the steps (founder directive 19 Nov 2026 §03, §07): My requests (drafts and sent), one
 * request and where it stands (what is happening, who acts next, what is needed, what happens next, its history), My spaces, and Help.
 * `IntakePages` chooses among them, the front door and the steps by the address.
 */
import { useMemo, useState } from 'react';
import { PageHero, Tag, Icon, Chip, EmptyState } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { fullName, roomById, roomHref } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { load as loadDesk } from '../decisions/store.js';
import { incidentOf } from '../workspace/store.js';
import { KINDS, kindOf, goalLabel, propose } from './model.js';
import { loadRecords, recordById, discardDraft, standing, stateOf, draftOf, photoChecklist, mayView, type Request } from './store.js';
import { IntakeNav, RequestItem, ProposedRoom, Summary, opensFor, day, plural } from './parts.js';
import { parseHash } from '../registry.pages.js';
import { ask, answer, route, close, verifyLocation, queue, addExamples, EXAMPLES, TRIAGE_ROLES, VERIFY_ROLES } from './triage.js';
import { CAMPUS_ROOMS } from '../campus/canon.js';
import type { RoleKey } from '../registry.types.js';

import Home from './Home.js';
import Wizard from './Wizard.js';

export function Mine({ role }: PageProps) {
  const { w } = useWorkspace(); const desk = useMemo(() => loadDesk(), []); const [all, setAll] = useState(() => loadRecords().filter((r) => r.role === role)); const [asking, setAsking] = useState<string | null>(null);
  const drafts = all.filter((r) => stateOf(r) === 'DRAFT'); const sent = all.filter((r) => stateOf(r) !== 'DRAFT');
  const discard = (id: string) => { const r = discardDraft(id); if (!('why' in r)) { setAll(loadRecords().filter((x) => x.role === role)); setAsking(null); } };
  return (
    <div className="ik" data-native="" data-testid="ik-mine">
      <IntakeNav role={role} here="mine" />
      <PageHero compact eyebrow="Intake" icon="inbox" title="My requests" lede={`What you have started and sent as the ${ROLES[role].label}, from this browser, with where each stands and who acts next.`} meta={[<Tag key="s" tone="warn">Synthetic data</Tag>, <span key="r">Asking as the {ROLES[role].label}</span>]} />
      <section className="ik-sec" aria-labelledby="ik-d-h" data-testid="ik-mine-drafts"><h2 id="ik-d-h">Drafts ({drafts.length})</h2>
        {drafts.length ? <ul className="rq-mine">{drafts.map((r) => <RequestItem key={r.id} r={r} w={w} desk={desk} role={role} onDiscard={(id) => setAsking(id)} />)}</ul> : <p className="ui-muted">No drafts.</p>}
        {asking && <div className="ik-confirm" role="alertdialog" aria-labelledby="ik-c-h" data-testid="ik-confirm"><p id="ik-c-h"><b>Discard {asking}?</b> Its answers and photographs are removed from this browser. It was never sent, so nobody else has it.</p>
          <p><button type="button" className="ui-btn ui-btn--danger" onClick={() => discard(asking)} data-testid="ik-confirm-yes">Discard it</button> <button type="button" className="ui-btn" onClick={() => setAsking(null)}>Keep it</button></p></div>}</section>
      <section className="ik-sec" aria-labelledby="ik-s-h" data-testid="ik-mine-sent"><h2 id="ik-s-h">Sent ({sent.length})</h2>
        {sent.length ? <ul className="rq-mine" data-testid="rq-mine">{sent.map((r) => <RequestItem key={r.id} r={r} w={w} desk={desk} role={role} />)}</ul>
          : <EmptyState title="Nothing sent yet" icon="inbox" action={<a className="ui-btn ui-btn--primary" href="#/request">Ask for something</a>}>A request you send is listed here, in your own words, with where it stands.</EmptyState>}</section>
    </div>
  );
}

/** The request's history: its own events, then what happened to the project or the job it became. */
function history(r: Request, w: ReturnType<typeof useWorkspace>['w'], desk: ReturnType<typeof loadDesk>): Array<{ at: string; what: string; who: string }> {
  const out = (r.history || []).map((e) => ({ at: e.at, what: `${e.type} · ${e.detail}`, who: ROLES[e.by]?.label || e.by }));
  if (r.projectId) { for (const e of desk.events.filter((x) => x.aggregate === r.projectId && x.type !== 'request.submitted')) out.push({ at: e.at, what: `${e.type} · ${e.detail}`, who: e.by }); for (const dc of desk.decisions.filter((x) => x.projectId === r.projectId)) out.push({ at: dc.at, what: `Decision: ${dc.decision.toLowerCase()} (scope revision ${dc.scopeRev})${dc.reason ? ` · ${dc.reason}` : ''}`, who: dc.by }); }
  if (r.incidentId) { const i = incidentOf(w, r.incidentId); for (const h of i?.history || []) out.push({ at: h.at, what: `ServiceHands job ${r.incidentId}: ${h.to.toLowerCase().replace(/_/g, ' ')}`, who: h.by }); }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export function Track({ role, params }: PageProps) {
  const { w } = useWorkspace(); const desk = useMemo(() => loadDesk(), []); const [tick, setTick] = useState(0); const r = useMemo(() => recordById(params['id'] || ''), [params, tick]); const opens = opensFor(role);
  const [say, setSay] = useState(''); const [no, setNo] = useState<string | null>(null);
  if (!r) return <div className="ik" data-native="" data-testid="ik-track" data-found="no"><IntakeNav role={role} here="track" /><EmptyState title={`No request ${params['id'] || ''} in this browser`} icon="inbox" action={<a className="ui-btn ui-btn--primary" href="#/requests">My requests</a>}>Requests are kept in the browser they were made in. This demonstration has no shared server for them.</EmptyState></div>;
  if (!mayView(role, r)) return <div className="ik" data-native="" data-testid="ik-track" data-found="restricted"><IntakeNav role={role} here="track" /><EmptyState title={`${r.id} is not yours to open`} icon="lock" action={<a className="ui-btn ui-btn--primary" href="#/requests">My requests</a>}>A request is opened by the person who asked, the people who work on it, and the champion of its site. Ask the person who sent it to share what you need.</EmptyState></div>;
  const s = standing(r, w, desk); const draft = stateOf(r) === 'DRAFT'; const room = r.roomId ? roomById(r.roomId) : null; const d = draftOf(r); const p = r.draft ? propose(d) : null;
  const pol = r.policy; const atts = r.attachments || []; const missing = photoChecklist(d).filter(([i]) => !atts.some((a) => a.item === i));
  const needed = draft ? 'Finish it and send it.' : r.provisional && r.provisional.location !== 'VERIFIED' ? 'Nothing from you. Someone on site confirms where the new space is; photographs help them.' : s.state === 'HELD' && s.reason ? `What the approver asked for: ${s.reason}` : 'Nothing from you right now.';
  return (
    <div className="ik" data-native="" data-testid="ik-track" data-found="yes" data-id={r.id} data-state={s.state} data-record={stateOf(r)}>
      <IntakeNav role={role} here="track" />
      <PageHero compact eyebrow={`Request ${r.id}`} icon="ticket" title={r.title} lede={r.need || r.summary} meta={[<Tag key="t" tone={s.tone}>{s.words}</Tag>, <span key="k">{kindOf(r.kind).label}</span>, <span key="a">{draft ? `Started ${day(r.at)}` : `Sent ${day(r.submittedAt || r.at)} by the ${ROLES[r.role].label}`}</span>, <Tag key="s" tone="warn">Synthetic data</Tag>]} />
      {draft && <p><a className="ui-btn ui-btn--primary" href={`#/request/new?draft=${r.id}`} data-testid="ik-resume">Carry on with it</a></p>}
      <section className="ik-overview" aria-label="Where it stands" data-testid="ik-overview">
        <div><h2>What is happening</h2><p>{s.words}.{s.reason ? ` Reason given: ${s.reason}` : ''}</p></div>
        <div><h2>Who acts next</h2><p data-testid="ik-owner">{s.owner}</p></div>
        <div><h2>What is needed</h2><p>{needed}</p></div>
        <div><h2>What happens next</h2><p data-testid="ik-next">{s.next}</p></div>
      </section>
      {r.question && <section className={`ik-qa${r.question.answer ? '' : ' ik-qa--open'}`} aria-labelledby="ik-qa-h" data-testid="ik-question" data-answered={r.question.answer ? 'yes' : 'no'}><h2 id="ik-qa-h">{r.question.answer ? 'A question, answered' : 'A question for the person who asked'}</h2>
        <p><b>The {ROLES[r.question.by].label} asked</b> <span className="ui-meta">{day(r.question.at)}</span>: {r.question.text}</p>
        {r.question.answer ? <p><b>Answer</b> <span className="ui-meta">{day(r.question.answer.at)}</span>: {r.question.answer.text}</p>
          : role === r.role ? <form className="ik-form" onSubmit={(e) => { e.preventDefault(); const o = answer(role, r.id, say); if ('why' in o) setNo(o.why.join(' ')); else { setNo(null); setSay(''); setTick((n) => n + 1); } }}>
            <label htmlFor="ik-ans">Your answer</label><textarea id="ik-ans" rows={3} maxLength={600} value={say} onChange={(e) => setSay(e.target.value)} data-testid="ik-answer-text" />
            <button type="submit" className="ui-btn ui-btn--primary" data-testid="ik-answer">Send the answer</button>{no && <p role="alert" className="sc-msg sc-msg--no">{no}</p>}</form>
          : <p className="ui-muted">Waiting for the {ROLES[r.role].label} who asked to answer.</p>}</section>}
      {r.triage && <p className="ik-routed" data-testid="ik-triage" data-outcome={r.triage.outcome}><Icon name="route" size={18} /><span>{r.triage.outcome === 'closed' ? <><b>Closed by the {ROLES[r.triage.by].label}</b>{r.triage.duplicateOf ? <> as the same as <a href={`#/requests/${r.triage.duplicateOf}`}>{r.triage.duplicateOf}</a></> : null}: {r.triage.note}</> : <><b>Routed by the {ROLES[r.triage.by].label}</b> to {r.triage.outcome === 'desk' ? 'the decision desk' : 'ServiceHands'} on {day(r.triage.at)}: {r.triage.note}</>} <span className="ui-meta">Your own words are kept as you wrote them.</span></span></p>}
      <div className="ik-two">
        <section className="ik-sec" aria-labelledby="ik-sp-h" data-testid="ik-space"><h2 id="ik-sp-h">Space</h2>
          {r.provisional ? <p data-testid="ik-prv"><Tag tone="warn">Provisional</Tag> <b>{r.provisional.id}</b>: {r.provisional.name}, {r.provisional.buildingName}, floor {r.provisional.floor}. Awaiting review; not an operational room. {r.provisional.location === 'VERIFIED' ? <> Its location was confirmed on site by the {ROLES[r.provisional.verifiedBy as RoleKey]?.label || r.provisional.verifiedBy} on {day(r.provisional.verifiedAt || r.provisional.at)}: {r.provisional.verifiedNote}</> : ' Its location is documented by the requester and not yet verified.'}</p>
            : room ? <p>{fullName(room)} <span className="ui-meta">on record</span> · <a href={roomHref(room)}>Open the room</a></p> : <p className="ui-muted">Not about one room.</p>}
          {(r.goals || []).length > 0 && <p className="ik-goalline"><span className="ui-meta">Wanted:</span> {(r.goals || []).map((g) => <Chip key={g} small tone="muted">{goalLabel(g)}</Chip>)}</p>}
          {r.projectId && opens('#/intake') && <p><a href="#/intake">Open project {r.projectId} on the decision desk</a></p>}
          {r.incidentId && opens('#/servicehands') && <p><a href="#/servicehands">Open job {r.incidentId} in ServiceHands</a></p>}</section>
        <section className="ik-sec" aria-labelledby="ik-doc-h" data-testid="ik-docs"><h2 id="ik-doc-h">Photographs and files ({atts.length})</h2>
          {atts.length ? <ul className="ik-atts">{atts.map((a) => <li key={a.id}>{a.preview ? <img src={a.preview} alt={a.name} /> : <span className="ik-atts__file" aria-hidden="true"><Icon name="book" size={20} /></span>}<span><b>{a.name}</b><span className="ui-meta">added {day(a.at)} by the {ROLES[a.by]?.label || a.by} · location documented, not verified{a.sha256 ? ` · SHA-256 ${a.sha256.slice(0, 12)}…` : ''}</span></span></li>)}</ul>
            : <p className="ui-muted">None.{pol === 'DOCUMENTATION_REQUIRED' ? ' Photographs or a plan are needed before design; someone on site can take them.' : ''}</p>}
          {atts.length > 0 && missing.length > 0 && !draft && <p className="ui-meta">Not shown: {missing.map(([, l]) => l.replace(/^Show /, '').toLowerCase()).join('; ')}.</p>}</section>
      </div>
      {p && r.kind !== 'replace-device' && <section className="ik-sec" aria-labelledby="ik-pr-h"><h2 id="ik-pr-h">{r.kind === 'new-room' ? 'The room asked for, as proposed' : 'The room with this request, as proposed'}</h2><ProposedRoom p={p} d={d} people={r.kind === 'new-room' ? d.people : room?.capacity || 8} /><Summary p={p} d={d} /></section>}
      <section className="ik-sec" aria-labelledby="ik-h-h" data-testid="ik-history"><h2 id="ik-h-h">History</h2>
        <ol className="ik-hist">{history(r, w, desk).map((e, i) => <li key={i}><time dateTime={e.at}>{new Date(e.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time><span>{e.what}</span><span className="ui-meta">{e.who}</span></li>)}</ol>
        <p className="ui-meta">Events follow the platform’s convention (request.*, room.*), each with its version, who and when, and the request id as correlation.</p></section>
    </div>
  );
}

/** Requests to route, questions waiting, and new spaces whose location is to be confirmed (directive §06: the operations lead's work
 *  queue, the site champion's location verification). Each action is a recorded event on the request. */
export function Queue({ role }: PageProps) {
  const { apply } = useWorkspace(); const [tick, setTick] = useState(0); const q = useMemo(() => queue(), [tick]); const all = useMemo(() => loadRecords(), [tick]);
  const [open, setOpen] = useState<string | null>(null); const [note, setNote] = useState(''); const [to, setTo] = useState<'desk' | 'servicehands'>('desk'); const [room, setRoom] = useState(''); const [dup, setDup] = useState(''); const [no, setNo] = useState<string | null>(null); const [said, setSaid] = useState<string | null>(null);
  const mayRoute = TRIAGE_ROLES.includes(role); const mayVerify = VERIFY_ROLES.includes(role);
  const done = (o: { why: string[] } | { id: string }, what: string) => { if ('why' in o) { setNo(o.why.join(' ')); return; } setNo(null); setSaid(`${o.id}: ${what}`); setOpen(null); setNote(''); setRoom(''); setDup(''); setTick((n) => n + 1); };
  const pick = (id: string, r0: string | null) => { setOpen(open === id ? null : id); setNote(''); setNo(null); setRoom(r0 || ''); setDup(''); setTo('desk'); };
  return (
    <div className="ik" data-native="" data-testid="ik-queue">
      <IntakeNav role={role} here="queue" />
      <PageHero compact eyebrow="Intake" icon="route" title="Requests to triage" lede="Requests in the person’s own words, to route or to ask about; and new spaces whose location is to be confirmed. Routing creates a project or a job; it approves and assigns nothing." meta={[<Tag key="s" tone="warn">Synthetic data</Tag>, <span key="r">As the {ROLES[role].label}</span>]} />
      {said && <p role="status" className="sc-msg sc-msg--ok" data-testid="ik-q-done"><Icon name="check" size={18} /><span>{said}</span></p>}
      {mayRoute && EXAMPLES.some((x) => !all.some((r) => r.example === x.key)) && <p className="ik-examples" data-testid="ik-examples"><span>For a demonstration: add the Living Campus examples to this browser, five requests from an enterprise, a university, a stadium and a convention centre, sent by different people. Fictional venues, synthetic data.</span>
        <button type="button" className="ui-btn" onClick={() => { const o = apply((nx) => addExamples(nx)); setSaid(o.added.length ? `Added ${o.added.length} examples: ${o.added.join(', ')}.` : 'No example was added.'); if (o.refused.length) setNo(o.refused.join(' ')); setTick((n) => n + 1); }} data-testid="ik-examples-add">Add the examples</button></p>}
      {mayRoute && <section className="ik-sec" aria-labelledby="ik-q-r" data-testid="ik-q-route"><h2 id="ik-q-r">To route ({q.route.length})</h2>
        {q.route.length ? <ul className="ik-qlist">{q.route.map((r) => <li key={r.id} data-testid="ik-q-item" data-id={r.id}>
          <div className="rq-mine__h"><b><a href={`#/requests/${r.id}`}>{r.title}</a></b><span className="ui-meta">{r.example ? <Tag tone="muted">Example</Tag> : null} {r.id} · the {ROLES[r.role].label}, {day(r.submittedAt || r.at)}</span></div>
          <p className="ik-own">“{r.need || r.summary}”</p>
          <p className="ui-meta">{r.roomId && roomById(r.roomId) ? fullName(roomById(r.roomId)!) : 'Not about one room'} · {plural((r.attachments || []).length, 'file')}{(r.goals || []).length ? ` · wanted: ${(r.goals || []).map(goalLabel).join(', ').toLowerCase()}` : ''}</p>
          <button type="button" className="ui-btn ui-btn--sm" aria-expanded={open === r.id} onClick={() => pick(r.id, r.roomId)} data-testid="ik-q-open">{open === r.id ? 'Close' : 'Route, ask or close'}</button>
          {open === r.id && <div className="ik-form" data-testid="ik-q-form">
            <fieldset className="rq-chips"><legend>Where it goes</legend>{([['desk', 'Decision desk, as a project'], ['servicehands', 'ServiceHands, as a job']] as const).map(([k, l]) => <label key={k} className={to === k ? 'on' : ''}><input type="radio" name={`to-${r.id}`} checked={to === k} onChange={() => setTo(k)} />{l}</label>)}</fieldset>
            <label htmlFor="ik-q-room">Room {to === 'desk' ? '(optional)' : ''}</label><select id="ik-q-room" value={room} onChange={(e) => setRoom(e.target.value)} data-testid="ik-q-room"><option value="">{to === 'desk' ? 'Not about one room' : 'Choose the room'}</option>{CAMPUS_ROOMS.map((o) => <option key={o.id} value={o.id}>{fullName(o)}</option>)}</select>
            <label htmlFor="ik-q-note">Note to the person who asked</label><textarea id="ik-q-note" rows={3} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} data-testid="ik-q-note" />
            <p className="ik-q-acts">
              <button type="button" className="ui-btn ui-btn--primary" onClick={() => done(apply((nx) => route(nx, role, r.id, to, note, room || null)), to === 'desk' ? 'routed to the decision desk.' : 'routed to ServiceHands.')} data-testid="ik-q-route-go">Route it</button>
              <button type="button" className="ui-btn" onClick={() => done(ask(role, r.id, note), 'question sent to the person who asked.')} data-testid="ik-q-ask">Ask this as a question instead</button></p>
            <label htmlFor="ik-q-dup">Or close it as the same as</label><select id="ik-q-dup" value={dup} onChange={(e) => setDup(e.target.value)} data-testid="ik-q-dup"><option value="">Not a duplicate</option>{all.filter((x) => x.id !== r.id && stateOf(x) === 'SUBMITTED').map((x) => <option key={x.id} value={x.id}>{x.id}: {x.title}</option>)}</select>
            <p className="ik-q-acts"><button type="button" className="ui-btn ui-btn--quiet" onClick={() => done(close(role, r.id, note, dup || null), dup ? `closed as the same as ${dup}.` : 'closed.')} data-testid="ik-q-close">Close it, with the note as the reason</button></p>
            {no && <p role="alert" className="sc-msg sc-msg--no" data-testid="ik-q-no">{no}</p>}</div>}
        </li>)}</ul> : <p className="ui-muted">Nothing waiting to be routed.</p>}</section>}
      {mayRoute && q.asked.length > 0 && <section className="ik-sec" aria-labelledby="ik-q-a"><h2 id="ik-q-a">Waiting for an answer ({q.asked.length})</h2><ul className="ik-qlist">{q.asked.map((r) => <li key={r.id}><b><a href={`#/requests/${r.id}`}>{r.title}</a></b><span className="ui-meta">{r.id} · asked: {r.question?.text}</span></li>)}</ul></section>}
      {mayVerify && <section className="ik-sec" aria-labelledby="ik-q-v" data-testid="ik-q-verify"><h2 id="ik-q-v">Locations to confirm ({q.verify.length})</h2>
        {q.verify.length ? <ul className="ik-qlist">{q.verify.map((r) => <li key={r.id} data-testid="ik-v-item" data-id={r.id}>
          <div className="rq-mine__h"><b>{r.provisional!.name}</b><span className="ui-meta">{r.provisional!.id} · {r.provisional!.buildingName}, floor {r.provisional!.floor} · asked for in <a href={`#/requests/${r.id}`}>{r.id}</a> by the {ROLES[r.role].label}</span></div>
          {(r.attachments || []).some((a) => a.preview) && <p className="ik-thumbs">{(r.attachments || []).filter((a) => a.preview).map((a) => <img key={a.id} src={a.preview!} alt={a.name} />)}</p>}
          <button type="button" className="ui-btn ui-btn--sm" aria-expanded={open === `v-${r.id}`} onClick={() => pick(`v-${r.id}`, null)} data-testid="ik-v-open">{open === `v-${r.id}` ? 'Close' : 'Confirm the location'}</button>
          {open === `v-${r.id}` && <div className="ik-form"><label htmlFor="ik-v-note">What you saw on site</label><textarea id="ik-v-note" rows={2} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} data-testid="ik-v-note" />
            <p className="ik-q-acts"><button type="button" className="ui-btn ui-btn--primary" onClick={() => done(verifyLocation(role, r.id, note), 'location confirmed.')} data-testid="ik-v-go">Confirm where it is</button></p>
            <p className="ui-meta">Confirms the location only. The space stays provisional: requested, not designed, not built.</p>{no && <p role="alert" className="sc-msg sc-msg--no">{no}</p>}</div>}
        </li>)}</ul> : <p className="ui-muted">No new space is waiting for its location to be confirmed.</p>}</section>}
    </div>
  );
}

export function Spaces({ role }: PageProps) {
  const all = useMemo(() => loadRecords().filter((r) => r.role === role), [role]); const rooms = [...new Set(all.map((r) => r.roomId).filter((x): x is string => !!x && !!roomById(x)))]; const prov = all.filter((r) => r.provisional);
  return (
    <div className="ik" data-native="" data-testid="ik-spaces">
      <IntakeNav role={role} here="spaces" />
      <PageHero compact eyebrow="Intake" icon="room" title="My spaces" lede="The rooms you have asked about, and the new spaces you have asked for." meta={[<Tag key="s" tone="warn">Synthetic data</Tag>]} />
      <section className="ik-sec" aria-labelledby="ik-r-h"><h2 id="ik-r-h">Rooms on record ({rooms.length})</h2>
        {rooms.length ? <ul className="ik-spaces">{rooms.map((id) => { const o = roomById(id)!; const n = all.filter((r) => r.roomId === id).length; return <li key={id}><a href={roomHref(o)}><b>{fullName(o)}</b></a><span className="ui-meta">{plural(n, 'request')} from you</span><a className="ui-btn ui-btn--sm" href={`#/request?room=${id}`}>Ask for work here</a></li>; })}</ul>
          : <p className="ui-muted">None yet. <a href="#/lite">Find a room in Lite</a>.</p>}</section>
      <section className="ik-sec" aria-labelledby="ik-p-h"><h2 id="ik-p-h">New spaces you asked for ({prov.length})</h2>
        {prov.length ? <ul className="ik-spaces">{prov.map((r) => <li key={r.id}><b>{r.provisional!.name}</b><span className="ui-meta">{r.provisional!.id} · {r.provisional!.buildingName}, floor {r.provisional!.floor} · provisional, awaiting review</span><a className="ui-btn ui-btn--sm" href={`#/requests/${r.id}`}>Follow {r.id}</a></li>)}</ul>
          : <p className="ui-muted">None. A new space you ask for stays provisional until it is reviewed and built.</p>}</section>
    </div>
  );
}

export function Help({ role }: PageProps) {
  return (
    <div className="ik" data-native="" data-testid="ik-help">
      <IntakeNav role={role} here="help" />
      <PageHero compact eyebrow="Intake" icon="info" title="How requests work" lede="What happens after you ask, who looks at it, and what asking never does." />
      <section className="ik-sec" aria-labelledby="ik-hw-h"><h2 id="ik-hw-h">From asking to done</h2>
        <ol className="ik-flow"><li><b>You say what you need.</b> In plain words. The room’s details come from its record; nobody asks you for model numbers.</li>
          <li><b>You see what you are asking for.</b> For a room, the room as proposed, drawn by the same engine that designs every room here.</li>
          <li><b>You send it.</b> It gets an id (REQ-…) and you can follow it from My requests.</li>
          <li><b>The right people pick it up.</b> Rooms and changes go to engineering and the decision desk; equipment and faults go to ServiceHands; anything else to the AV operations team.</li>
          <li><b>You are told where it stands</b>, in plain words, with who acts next.</li></ol></section>
      <section className="ik-sec" aria-labelledby="ik-nv-h"><h2 id="ik-nv-h">What asking never does</h2>
        <ul><li>Nothing is ordered, bought or approved by asking. Approval and funding are separate decisions, each by the person entitled to make it.</li>
          <li>Asking grants no access to a room, a system or a site.</li><li>No size is read from a photograph, and no measurement is made up. A size you give is labelled as yours until it is surveyed.</li></ul></section>
      <section className="ik-sec" aria-labelledby="ik-wh-h"><h2 id="ik-wh-h">Where each kind of request goes</h2>
        <ul className="ik-kinds">{KINDS.map((k) => <li key={k.id}><b>{k.label}</b> <span>{k.then}</span></li>)}</ul></section>
      <section className="ik-sec" aria-labelledby="ik-nw-h"><h2 id="ik-nw-h">Something is broken now?</h2><p>Report it in ServiceHands: it asks what is wrong and suggests what to try first. <a className="ui-btn ui-btn--sm" href="#/servicehands/new">Report a problem</a></p></section>
      <p className="ui-meta">This demonstration keeps requests in your browser. Names, rooms and requests are synthetic. Teams, Outlook and SharePoint are not connected here, so nothing is sent to them.</p>
    </div>
  );
}

/** The Intake pages by address: #/request (front door), #/request/new and #/request/<kind> (the steps), a room or kind in the query (the
 *  steps, from a shortcut), #/request/spaces, #/request/help, #/requests, #/requests/<id>, and V2.5.3's #/intake/new. */
export default function IntakePages(props: PageProps) {
  const { segs } = parseHash(props.hash); const q = props.query;
  const view = segs[0] === 'requests' ? (segs[1] ? 'track' : 'mine') : segs[0] === 'intake' ? 'new' : segs[1] === 'help' ? 'help' : segs[1] === 'spaces' ? 'spaces' : segs[1] === 'queue' ? 'queue' : segs[1] || q.get('kind') || q.get('room') || q.get('draft') || q.get('card') ? 'new' : 'home';
  const params = segs[0] === 'requests' && segs[1] ? { ...props.params, id: segs[1] } : props.params;
  return view === 'home' ? <Home {...props} /> : view === 'new' ? <Wizard key={view} {...props} /> : view === 'mine' ? <Mine {...props} /> : view === 'track' ? <Track key={params['id']} {...props} params={params} /> : view === 'spaces' ? <Spaces {...props} /> : view === 'queue' ? <Queue {...props} /> : <Help {...props} />;
}
