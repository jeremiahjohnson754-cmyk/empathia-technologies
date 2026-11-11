/**
 * #/onboard, #/onboard/<edition> — the IT Onboarding Success Guide in its four editions (founder, §08 Product A).
 * One programme (program.ts), one record (store.ts), four views of them. A role is offered only the editions it holds (roles.ts),
 * and the record it is shown is cut down in one place (store.ts › viewFor). Personal detail about the starter comes from the
 * organisation's own records at the moment of viewing (profile.ts); what the organisation has not provided is said, not filled in.
 */
import { useState } from 'react';
import { PageHero, Card, Chip, Notice, Icon } from '@empathia/ui';
import type { PageProps, RoleKey } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { CHECKS, COMPETENCIES, EDITIONS, ITEMS, PATHWAY_EXAMPLES, RATINGS, TOPICS, checkById, itemById, type Edition, type Item, type Rating } from './program.js';
import { OB_ROLES, editionsFor, isAdministrator, isManager, isMentor, isStarter, seesProgress } from './roles.js';
import { fieldOf, placeHref, profile, type Profile } from './profile.js';
import { completeItem, freshnessOf, obView, phases, publish, recordReview, report, takeCheck, viewFor, type ObState, type PhaseView } from './store.js';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const KIND: Record<Item['kind'], string> = { learn: 'Learn', meet: 'Meet', do: 'Do', exercise: 'Exercise', review: 'Review' };
const CONFIRMS: Record<Item['confirm'], string> = { self: 'You say when it is done', check: 'Done by passing its check', mentor: 'Confirmed by the mentor', manager: 'Confirmed by the manager' };
const DEFAULT: Record<string, Edition> = { own: 'employee', manager: 'manager', mentor: 'mentor', counts: 'administrator', none: 'employee' };
type Act = (fn: Parameters<ReturnType<typeof useWorkspace>['apply']>[0], ok: string) => boolean;
interface Shared { role: RoleKey; can: PageProps['can']; s: ObState; view: ObState; p: Profile; ph: PhaseView[]; act: Act; opens: (href: string) => boolean }

export default function OnboardPage({ role, params, can }: PageProps) {
  const { w, apply } = useWorkspace(); const s = obView(w); const view = viewFor(role, s); const p = profile(); const mine = editionsFor(role);
  const want = (params['edition'] || DEFAULT[seesProgress(role)]) as Edition; const known = want in EDITIONS; const held = known && mine.includes(want);
  const [said, setSaid] = useState<string | null>(null); const [no, setNo] = useState<string | null>(null);
  const opens = (href: string) => { const x = resolve(href.split('?')[0]!); return !!x && canOpen(role, x); };
  const act: Act = (fn, ok) => { const r = apply(fn) as unknown; const why = r && typeof r === 'object' && 'why' in (r as object) ? (r as { why: string[] }).why : null; setNo(why ? why.join(' ') : null); setSaid(why ? null : ok); return !why; };
  const fresh = freshnessOf(s, Date.now()); const shared: Shared = { role, can, s, view, p, ph: phases(view), act, opens };

  return (
    <div className="pa ob" data-native="" data-testid="onboard" data-edition={held ? want : 'none'} data-rev={fresh.rev.rev}>
      <PageHero compact eyebrow="Onboard" title="IT Onboarding Success Guide" product="learn" icon="book"
        lede="A new colleague’s first ninety days: what to learn, whom to meet, what to do, and how the people around them help. One programme, in four editions."
        meta={[<Chip key="s" small tone="warn">Synthetic data</Chip>, <Chip key="d" small tone="muted">Draft: not yet reviewed by a practising IT manager</Chip>,
          <span key="f" data-testid="ob-fresh" data-state={fresh.state}><Chip small tone={fresh.state === 'CURRENT' ? 'muted' : fresh.state === 'DUE' ? 'warn' : 'bad'}>Revision {fresh.rev.rev}, published {day(fresh.rev.at)} · {fresh.state === 'CURRENT' ? `review by ${day(fresh.rev.reviewBy)}` : fresh.state === 'DUE' ? `review due in ${plural(fresh.days, 'day')}` : `past its review date by ${plural(-fresh.days, 'day')}`}</Chip></span>]} />

      <nav className="ob-eds" aria-label="Editions" data-testid="ob-editions">{mine.map((e) => <a key={e} className="pa-own" href={`#/onboard/${e}`} data-edition={e} aria-current={held && e === want ? 'page' : undefined}><b>{EDITIONS[e].title}</b><span>{EDITIONS[e].forWhom}</span></a>)}</nav>

      {no ? <div role="alert" className="ob-msg ob-msg--no" data-testid="ob-refused"><Icon name="alert" size={18} /><span>{no}</span></div> : null}
      {said && !no ? <p role="status" className="ob-msg ob-msg--ok" data-testid="ob-said"><Icon name="check" size={18} /><span>{said}</span></p> : null}

      {!held ? <div role="alert" className="ob-msg ob-msg--no" data-testid="ob-not-held"><Icon name="lock" size={18} /><span>{known ? `The ${ROLES[role].label} does not hold the ${EDITIONS[want].title.toLowerCase()}. It is for ${EDITIONS[want].forWhom.toLowerCase()}.` : 'There is no such edition.'} <a href="#/onboard">Open the edition you hold</a></span></div>
        : want === 'employee' ? <EmployeeEdition {...shared} />
        : want === 'manager' ? <ManagerEdition {...shared} />
        : want === 'mentor' ? <MentorEdition {...shared} />
        : <AdministratorEdition {...shared} />}

      <Notice tone="info">
        <b>What this guide is.</b> A programme written for this demonstration from the founder’s list of contents, not yet reviewed by a practising IT manager. A check here is a count of right answers and a review is a manager’s record of a conversation: neither is a qualification. The people and the organisation are synthetic. What an organisation has not provided is shown as not recorded.
      </Notice>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------------------ shared pieces
function Who({ p, opens }: { p: Profile; opens: Shared['opens'] }) {
  const missing = p.fields.filter((f) => f.value === null);
  const person = (label: string, x: Profile['manager']) => <div><dt>{label}</dt><dd>{x ? (opens(`#/people/${x.id}`) ? <a href={`#/people/${x.id}`}>{x.name}</a> : x.name) : 'Not recorded'}{x ? <span className="ui-meta"> · {x.title}</span> : null}</dd></div>;
  return (
    <Card title="The starter" icon="users" sub="Read from the organisation’s own records when this page opens. Names are synthetic." testId="ob-profile">
      <dl className="ob-facts">
        <div><dt>Organisation</dt><dd>{fieldOf(p, 'employer')?.value}</dd></div>
        <div><dt>Role</dt><dd>{fieldOf(p, 'role')?.value}{p.siteName ? ` at ${p.siteName}` : ''}{p.rooms ? ` · ${plural(p.rooms, 'room')}` : ''}</dd></div>
        {person('Starter', p.starter)}{person('Manager', p.manager)}{person('Mentor', p.mentor)}{person('Site champion', p.champion)}
      </dl>
      {missing.length ? <p className="ob-note" data-testid="ob-missing">Not recorded by this organisation: {missing.map((f) => f.label.toLowerCase()).join(', ')}. Nothing is filled in for them.</p> : null}
    </Card>
  );
}
function ItemBody({ it, p, opens }: { it: Item; p: Profile; opens: Shared['opens'] }) {
  const href = it.place ? placeHref(it.place, p) : null; const need = it.needs ? fieldOf(p, it.needs) : null;
  return (<>
    <span className="ob-why">{it.why}</span>
    <span className="ob-tags"><Chip small tone="muted">{KIND[it.kind]}</Chip><Chip small tone="muted">{TOPICS[it.topic]}</Chip>{href && opens(href) ? <a href={href}>Open where this happens</a> : null}</span>
    {it.rubric ? <div className="ob-rubric"><span>What good looks like</span><ul>{it.rubric.map((r) => <li key={r}>{r}</li>)}</ul></div> : null}
    {need && need.value === null ? <span className="ob-need" data-need={need.id}><Icon name="info" size={14} /> This organisation has not recorded its {need.label.toLowerCase()}. Ask your manager; nothing is assumed here.</span> : null}
  </>);
}
function CheckForm({ id, sh }: { id: string; sh: Shared }) {
  const c = checkById(id)!; const [picked, setPicked] = useState<Record<number, number>>({}); const [res, setRes] = useState<{ passed: boolean; score: number; of: number; wrong: number[] } | null>(null);
  const k = sh.view.checks[id];
  const go = () => { let got: { passed: boolean; score: number; of: number; wrong: number[] } | null = null;
    const ok = sh.act((n) => { const r = takeCheck(n, sh.role, id, c.questions.map((_, i) => picked[i] ?? -1)); if ('ok' in r) got = r; return r; }, `Check “${c.title}” marked.`); setRes(ok ? got : null); };
  return (
    <form className="ob-check" noValidate data-testid={`ob-check-${id}`} onSubmit={(e) => { e.preventDefault(); go(); }}>
      {c.questions.map((q, i) => { const wrong = res?.wrong.includes(i); return (
        <fieldset key={q.q} data-marked={res ? (wrong ? 'wrong' : 'right') : 'no'}><legend>{q.q}</legend>
          {q.options.map((o, j) => <label key={o} className="ob-opt"><input type="radio" name={`${id}-${i}`} checked={picked[i] === j} onChange={() => { setPicked({ ...picked, [i]: j }); setRes(null); }} /><span>{o}</span></label>)}
          {res ? <p className={`ob-because ob-because--${wrong ? 'no' : 'ok'}`}><Icon name={wrong ? 'alert' : 'check'} size={14} /><span><b>{wrong ? 'Not this one.' : 'Right.'}</b> {q.why}</span></p> : null}
        </fieldset>); })}
      <div className="ob-row"><button type="submit" className="ui-btn ui-btn--sm" data-testid={`ob-check-go-${id}`}>Check my answers</button>
        {res ? <span role="status" data-testid={`ob-check-result-${id}`} data-passed={res.passed ? 'yes' : 'no'}>{res.score} of {res.of}. {res.passed ? 'Passed: a count of right answers, not a qualification.' : 'Not passed yet. Every answer has to be right; the reasons are above.'}</span>
          : k ? <span className="ui-meta">Last try: {k.score} of {k.of} on {day(k.at)}.</span> : null}</div>
    </form>
  );
}

// ------------------------------------------------------------------------------------------------------------ employee edition
function EmployeeEdition(sh: Shared) {
  const { role, can, p, ph, act, opens } = sh; const own = isStarter(role); const sees = seesProgress(role);
  const total = ph.reduce((n, x) => n + x.total, 0); const done = ph.reduce((n, x) => n + x.done, 0);
  return (<>
    {own ? <Who p={p} opens={opens} /> : <p className="ob-msg ob-msg--info" data-testid="ob-programme-only"><Icon name="info" size={18} /><span>You are reading the programme a new starter follows. {sees === 'none' || sees === 'counts' ? 'A starter’s own progress is shown to them, their manager and their mentor, and to nobody else.' : `The starter’s progress is in the ${sees} edition.`}</span></p>}
    {own ? <p className="ob-sum" data-testid="ob-progress" data-done={done} data-total={total}>{done} of {total} done · {plural(ph.filter((x) => x.met).length, 'milestone')} of {ph.length} met. Take the items in any order inside a phase.</p> : null}
    {ph.map((x) => (
      <section key={x.phase} className="ob-phase" aria-labelledby={`ob-ph-${x.phase}`} data-testid={`ob-phase-${x.phase}`} data-met={own && x.met ? 'yes' : 'no'} data-done={x.done}>
        <header><h2 id={`ob-ph-${x.phase}`}>{x.title}</h2><p className="ui-meta">{x.when}. {x.aim}</p>{own ? <span className="ob-tags"><Chip small tone={x.met ? 'ok' : 'muted'}>{x.met ? 'Milestone met' : `${x.done} of ${x.total} done`}</Chip></span> : null}</header>
        <ol className="ob-items">{x.items.map(({ item: it, done: d }) => (
          <li key={it.id} data-item={it.id} data-done={own && d ? 'yes' : 'no'} data-confirm={it.confirm} data-owner={it.owner || 'starter'}>
            <div className="ob-item"><b>{it.title}</b><ItemBody it={it} p={p} opens={opens} />
              <span className="ob-state">{it.owner ? `${it.owner === 'manager' ? 'Your manager’s' : 'Your mentor’s'} part. ` : ''}{own && d ? <><Icon name="check" size={14} /> Done on {day(d.at)}{d.note ? ` · “${d.note}”` : ''}</> : it.kind === 'review' ? 'Recorded by your manager after the conversation.' : `${CONFIRMS[it.confirm]}.`}</span>
              {own && !d && it.confirm === 'check' && it.check && can('onboard.check') ? <CheckForm id={it.check} sh={sh} /> : null}
            </div>
            {own && !d && it.confirm === 'self' && can('onboard.done') ? <button type="button" className="ui-btn ui-btn--sm" data-testid={`ob-done-${it.id}`} onClick={() => act((n) => completeItem(n, role, it.id), `“${it.title}” marked done. It is your own word; your manager sees it.`)}>I have done this</button> : null}
          </li>))}</ol>
      </section>))}
    <Card title="Certification pathways" icon="info" sub="What an organisation asks of a role is its own decision." testId="ob-pathways">
      <p className="ob-note">This organisation has not recorded required training for the role, so none is listed. Examples of certifications people in this field hold: {PATHWAY_EXAMPLES.join(', ')}. Naming them here is not a requirement, a recommendation or an endorsement.</p>
    </Card>
  </>);
}

// ------------------------------------------------------------------------------------------------------------ manager edition
function ReviewForm({ id, sh }: { id: string; sh: Shared }) {
  const it = itemById(id)!; const phase = sh.ph.find((x) => x.review === id)!; const open = phase.items.filter((x) => !x.done && x.item.kind !== 'review'); const had = sh.view.reviews[id];
  const [r, setR] = useState<Record<string, Rating>>({}); const [note, setNote] = useState(''); const at = id === 'm1-review' ? 'day30' : id === 's1-review' ? 'day60' : id === 'n1-review' ? 'day90' : null;
  return (
    <section className="ob-review" aria-labelledby={`ob-rv-${id}`} data-testid={`ob-review-${id}`} data-recorded={had ? 'yes' : 'no'}>
      <h3 id={`ob-rv-${id}`}>{it.title}</h3><p className="ui-meta">{it.why}</p>
      {open.length ? <p className="ob-note" data-testid={`ob-open-${id}`}>{plural(open.length, 'item')} of this phase {open.length === 1 ? 'is' : 'are'} still open: {open.map((x) => x.item.title).join('; ')}. A review can be recorded now; the milestone is met when they are done.</p> : null}
      {had ? <div className="ob-had"><p><Icon name="check" size={14} /> Recorded on {day(had.at)}. “{had.note}”</p><ul>{COMPETENCIES.map((c) => <li key={c.id}><b>{c.title}</b><span>{RATINGS[had.ratings[c.id]!]}</span></li>)}</ul></div> : null}
      {sh.can('onboard.review') ? <form noValidate onSubmit={(e) => { e.preventDefault(); if (sh.act((n) => recordReview(n, sh.role, id, r, note), `“${it.title}” recorded. The note is shown to the starter and to you.`)) { setR({}); setNote(''); } }}>
        {COMPETENCIES.map((c) => <fieldset key={c.id} className="ob-rate"><legend>{c.title}{at ? <span className="ui-meta"> · expected by now: {c[at].charAt(0).toLowerCase()}{c[at].slice(1)}</span> : null}</legend>
          {RATINGS.map((label, j) => <label key={label} className="ob-opt ob-opt--inline"><input type="radio" name={`${id}-${c.id}`} checked={r[c.id] === j} onChange={() => setR({ ...r, [c.id]: j as Rating })} /><span>{label}</span></label>)}</fieldset>)}
        <div className="ui-field"><label htmlFor={`ob-rn-${id}`}>What was agreed</label><textarea id={`ob-rn-${id}`} rows={2} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} data-testid={`ob-review-note-${id}`} /></div>
        <div className="ob-row"><button type="submit" className="ui-btn ui-btn--sm" data-testid={`ob-review-go-${id}`}>{had ? 'Record it again' : 'Record the review'}</button></div>
      </form> : null}
    </section>
  );
}
function ConfirmList({ items, sh, who }: { items: Array<{ item: Item; done: ObState['done'][string] | null }>; sh: Shared; who: 'manager' | 'mentor' }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  return (
    <ol className="ob-items">{items.map(({ item: it, done: d }) => (
      <li key={it.id} data-item={it.id} data-done={d ? 'yes' : 'no'} data-confirm={it.confirm}>
        <div className="ob-item"><b>{it.title}</b><ItemBody it={it} p={sh.p} opens={sh.opens} />
          {d ? <span className="ob-state"><Icon name="check" size={14} /> Confirmed on {day(d.at)}{d.note ? ` · “${d.note}”` : ''}</span>
            : sh.can('onboard.confirm') ? <div className="ob-confirm"><div className="ui-field"><label htmlFor={`ob-n-${it.id}`}>{who === 'mentor' && it.kind === 'exercise' ? 'Feedback: what you saw, and what to work on next' : 'A note (optional)'}</label><input id={`ob-n-${it.id}`} type="text" maxLength={300} value={notes[it.id] || ''} onChange={(e) => setNotes({ ...notes, [it.id]: e.target.value })} data-testid={`ob-note-${it.id}`} /></div>
              <button type="button" className="ui-btn ui-btn--sm" data-testid={`ob-confirm-${it.id}`} onClick={() => { if (sh.act((n) => completeItem(n, sh.role, it.id, notes[it.id] || ''), `“${it.title}” confirmed. The starter sees it.`)) setNotes({ ...notes, [it.id]: '' }); }}>{it.owner ? 'I have done this' : 'I have seen this'}</button></div> : null}
        </div>
      </li>))}</ol>
  );
}
function Progress({ ph }: { ph: PhaseView[] }) {
  return (
    <div className="ob-scroll"><table className="ob-table" data-testid="ob-phases"><caption className="ui-sr">Progress by phase</caption>
      <thead><tr><th scope="col">Phase</th><th scope="col">Done</th><th scope="col">Review</th><th scope="col">Milestone</th></tr></thead>
      <tbody>{ph.map((x) => <tr key={x.phase} data-phase={x.phase} data-met={x.met ? 'yes' : 'no'}><th scope="row">{x.title}<span className="ui-meta"> · {x.when}</span></th><td>{x.done} of {x.total}</td><td>{x.review ? (x.reviewed ? 'Recorded' : 'Not yet') : 'None in this phase'}</td><td>{x.met ? 'Met' : 'Open'}</td></tr>)}</tbody></table></div>
  );
}
function ManagerEdition(sh: Shared) {
  const { p, ph, opens } = sh; const mine = ph.flatMap((x) => x.items).filter((x) => x.item.confirm === 'manager' && x.item.kind !== 'review'); const access = ph.flatMap((x) => x.items).find((x) => x.item.id === 'pre-access');
  return (<>
    <Who p={p} opens={opens} />
    <Card title="Progress and milestones" icon="check" sub="A milestone is met when every item of its phase is done and its review is recorded. Nobody ticks it." testId="ob-progress-card"><Progress ph={ph} /></Card>
    <Card title="Access readiness" icon="lock" sub="Ready means tested by someone, not merely approved." testId="ob-access">
      <p className="ob-note" data-ready={access?.done ? 'yes' : 'no'}>{access?.done ? `You confirmed on ${day(access.done.at)} that accounts and access are ready.` : 'Not confirmed yet. It is the second item below.'} {fieldOf(p, 'access')?.value === null ? 'This organisation has not recorded its access procedures, so the list of what to request is not shown here.' : ''}</p>
    </Card>
    <section className="ob-phase" aria-labelledby="ob-mgr-h" data-testid="ob-manager-items"><header><h2 id="ob-mgr-h">Yours to do or confirm</h2><p className="ui-meta">Before day one, and at the points where the starter needs your decision.</p></header><ConfirmList items={mine} sh={sh} who="manager" /></section>
    <section className="ob-phase" aria-labelledby="ob-rev-h"><header><h2 id="ob-rev-h">Reviews</h2><p className="ui-meta">A record of a conversation: five ratings and what was agreed. The same five each time, so the three can be compared.</p></header>
      {ph.filter((x) => x.review).map((x) => <ReviewForm key={x.review!} id={x.review!} sh={sh} />)}</section>
    <Card title="What is expected, and when" icon="info" sub="Assignment expectations for the role, at thirty, sixty and ninety days." testId="ob-expect">
      <div className="ob-scroll"><table className="ob-table"><caption className="ui-sr">Competency expectations</caption><thead><tr><th scope="col">Competency</th><th scope="col">By day 30</th><th scope="col">By day 60</th><th scope="col">By day 90</th></tr></thead>
        <tbody>{COMPETENCIES.map((c) => <tr key={c.id}><th scope="row">{c.title}</th><td>{c.day30}</td><td>{c.day60}</td><td>{c.day90}</td></tr>)}</tbody></table></div>
    </Card>
  </>);
}

// ------------------------------------------------------------------------------------------------------------ mentor edition
function MentorEdition(sh: Shared) {
  const { p, ph, opens } = sh; const mine = ph.flatMap((x) => x.items).filter((x) => x.item.confirm === 'mentor');
  return (<>
    <Who p={p} opens={opens} />
    <section className="ob-phase" aria-labelledby="ob-men-h" data-testid="ob-mentor-items"><header><h2 id="ob-men-h">Your coaching plan</h2><p className="ui-meta">What to show, what to watch, and what to say afterwards. An exercise is confirmed with its feedback; the starter reads it.</p></header><ConfirmList items={mine} sh={sh} who="mentor" /></section>
    <Card title="Where the starter is" icon="check" sub="Whether each phase’s items are done. You are not shown the starter’s own notes, their check answers or their reviews." testId="ob-mentor-progress">
      <div className="ob-scroll"><table className="ob-table" data-testid="ob-phases"><caption className="ui-sr">The starter’s progress by phase</caption><thead><tr><th scope="col">Phase</th><th scope="col">Items done</th><th scope="col">What they are learning</th></tr></thead>
        <tbody>{ph.map((x) => { const items = x.items.filter((i) => i.item.kind !== 'review'); return <tr key={x.phase} data-phase={x.phase}><th scope="row">{x.title}</th><td>{items.filter((i) => i.done).length} of {items.length}</td><td>{[...new Set(items.map((i) => TOPICS[i.item.topic]))].join(', ')}</td></tr>; })}</tbody></table></div>
    </Card>
    <Card title="Giving feedback" icon="info" sub="Three habits, for every exercise." testId="ob-coach">
      <ul className="ob-plain"><li>Say what you saw before what you think of it.</li><li>Name one thing to keep and one thing to change.</li><li>Agree what the next exercise is, and when.</li></ul>
    </Card>
  </>);
}

// ------------------------------------------------------------------------------------------------------------ administrator edition
function AdministratorEdition(sh: Shared) {
  const { role, can, s, p, act } = sh; const rep = report(s); const [note, setNote] = useState(''); const [days, setDays] = useState(180); const revs = [...s.revisions].reverse();
  return (<>
    <Card title="Publishing" icon="book" sub="A revision records what changed and when it is to be reviewed. The earlier revision is kept." testId="ob-publish">
      {can('onboard.publish') ? <form className="ob-form" noValidate onSubmit={(e) => { e.preventDefault(); if (act((n) => publish(n, role, note, days), 'The revision is published. The earlier one is archived, not removed.')) setNote(''); }}>
        <div className="ui-field"><label htmlFor="ob-pn">What changed in this revision</label><input id="ob-pn" type="text" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} data-testid="ob-publish-note" /></div>
        <div className="ui-field"><label htmlFor="ob-pd">Review it within</label><select id="ob-pd" value={days} onChange={(e) => setDays(Number(e.target.value))} data-testid="ob-publish-days"><option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>365 days</option></select></div>
        <div className="ob-row"><button type="submit" className="ui-btn ui-btn--primary" data-testid="ob-publish-go">Publish a revision</button></div>
      </form> : null}
      <p className="ob-note">In this demonstration the programme’s text is fixed: publishing records a revision and its review date. Editing the text, and translating it, are not built. The programme exists in English only.</p>
      <ol className="ob-revs" data-testid="ob-revisions">{revs.map((r) => <li key={r.rev} data-rev={r.rev} data-state={r.state}><b>Revision {r.rev}</b><Chip small tone={r.state === 'PUBLISHED' ? 'ok' : 'muted'}>{r.state === 'PUBLISHED' ? 'Published' : 'Archived'}</Chip><span>{day(r.at)} by the {ROLES[r.by].label} · review by {day(r.reviewBy)}</span><span>{r.note}</span></li>)}</ol>
    </Card>
    <Card title="What the organisation has provided" icon="info" sub="The guide is personalised only from these. What is not recorded is said on the page, never filled in." testId="ob-fields-card">
      <div className="ob-scroll"><table className="ob-table" data-testid="ob-fields"><caption className="ui-sr">Tenant-specific information</caption><thead><tr><th scope="col">Information</th><th scope="col">Recorded</th><th scope="col">Read from</th></tr></thead>
        <tbody>{p.fields.map((f) => <tr key={f.id} data-field={f.id} data-recorded={f.value === null ? 'no' : 'yes'}><th scope="row">{f.label}</th><td>{f.value === null ? 'Not recorded' : f.id === 'reporting' || f.id === 'mentor' || f.id === 'contacts' ? 'Yes (names are shown to the starter and their manager)' : f.value}</td><td>{f.from}</td></tr>)}</tbody></table></div>
    </Card>
    <Card title="Reporting" icon="check" sub="Counts only. An administrator is not shown a person’s notes, ratings or answers." testId="ob-report">
      <dl className="ob-facts" data-items={rep.items.done} data-checks={rep.checks.passed} data-reviews={rep.reviews.recorded} data-milestones={rep.milestones.met}>
        <div><dt>Items done</dt><dd>{rep.items.done} of {rep.items.total}</dd></div><div><dt>Checks passed</dt><dd>{rep.checks.passed} of {rep.checks.total}</dd></div><div><dt>Reviews</dt><dd>{rep.reviews.recorded} of {rep.reviews.total} recorded</dd></div><div><dt>Milestones</dt><dd>{rep.milestones.met} of {rep.milestones.total} met</dd></div>
      </dl>
      <p className="ob-note">One starter is in this demonstration. {rep.byPhase.map((x) => `${x.title}: ${x.done} of ${x.total}`).join(' · ')}.</p>
    </Card>
    <Card title="Who holds which edition" icon="users" sub="By role. A starter never confirms a manager’s or a mentor’s item, and nobody rates themselves." testId="ob-holders">
      <dl className="ob-facts">{(Object.keys(EDITIONS) as Edition[]).map((e) => <div key={e}><dt>{EDITIONS[e].title}</dt><dd>{EDITIONS[e].holds} <span className="ui-meta">Held by: {(e === 'employee' ? OB_ROLES.programme : e === 'manager' ? OB_ROLES.manager : e === 'mentor' ? OB_ROLES.mentor : OB_ROLES.administrator).map((r) => ROLES[r].label).join(', ')}.{e === 'employee' ? ` The starter here is the ${ROLES[OB_ROLES.starter[0]!].label}.` : ''}</span></dd></div>)}</dl>
      <p className="ob-note">{plural(ITEMS.length, 'item')}, {plural(CHECKS.length, 'check')}, {plural(COMPETENCIES.length, 'competency', 'competencies')}. {isAdministrator(role) && !isManager(role) && !isMentor(role) ? 'These role assignments are a modelling decision of this demonstration, awaiting the founder.' : ''}</p>
    </Card>
  </>);
}
