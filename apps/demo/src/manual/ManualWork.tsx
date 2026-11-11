/**
 * The working views of the manual (see ManualPage.tsx): one room's requirements and commissioning template, a saved set and the
 * findings against it, and exceptions. Each says whose act a step is; a step that is not the reader's is explained, not hidden behind
 * a dead button. Nothing here changes a room's record, records a test result or approves a design.
 */
import { useMemo, useState } from 'react';
import { Card, Chip, Notice } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { roomRecord } from '../campus/design.js';
import { BUILDINGS, CAMPUS_ROOMS, REFERENCE_ROOM_ID, roomById } from '../campus/canon.js';
import { ALL_PRINCIPLES, principleById } from './content.js';
import { ACCESS, PROFILES, byChapter, generate } from './workflow.js';
import { closeException, decideException, exceptionState, inForce, neverExcepted, recordFinding, repeated, requestException, rowState, saveSet, setState, type ExceptionKind, type ExceptionState, type ManualState, type RowState } from './store.js';
import { day, plural, testLabel, type Act } from './ManualPage.js';

type Common = { role: PageProps['role']; s: ManualState; now: number; act: Act; can: PageProps['can'] };
const words = (k: string) => k.toLowerCase().replace(/_/g, ' ');
const ENGINE_WORD: Record<string, string> = { PENDING_INFORMATION: 'Facts missing from the record', BLOCKED_BY_PREREQUISITE: 'Waits for an approved design', REQUIRES_PHYSICAL_EXECUTION: 'To be done in the room' };
const ROW_WORD: Record<RowState, string> = { OPEN: 'Not yet reviewed', MET: 'Met', NOT_MET: 'Not met', EXCEPTED: 'Under an approved exception' };
const ROW_TONE: Record<RowState, 'muted' | 'ok' | 'bad' | 'warn'> = { OPEN: 'muted', MET: 'ok', NOT_MET: 'bad', EXCEPTED: 'warn' };
const EX_WORD: Record<ExceptionState, string> = { REQUESTED: 'Asked for', APPROVED: 'Approved', REFUSED: 'Refused', LAPSED: 'Past its date', CLOSED: 'Closed' };
const EX_TONE: Record<ExceptionState, 'muted' | 'ok' | 'bad' | 'warn' | 'info'> = { REQUESTED: 'info', APPROVED: 'warn', REFUSED: 'muted', LAPSED: 'bad', CLOSED: 'muted' };
const SET_WORD = { IN_REVIEW: 'In review', NOT_MET: 'A requirement is not met', REVIEWED: 'Reviewed' } as const;
const NEED_WORD: Record<string, string> = { camera: 'A camera', dsp: 'Audio processing', mic: 'Microphones', speaker: 'Loudspeakers', display: 'A display', compute: 'A room computer', switch: 'A network switch', encoder: 'An encoder' };
const an = (word: string) => `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;
const roomHref = (id: string) => { const r = roomById(id); return r ? `#/campus/${r.building}/${r.floor}/${r.id}` : '#/campus'; };
function RoomSelect({ id, value, onChange, testId }: { id: string; value: string; onChange: (v: string) => void; testId: string }) {
  return <select id={id} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}>{BUILDINGS.filter((b) => CAMPUS_ROOMS.some((r) => r.building === b.key)).map((b) => <optgroup key={b.key} label={b.name}>{CAMPUS_ROOMS.filter((r) => r.building === b.key).map((r) => <option key={r.id} value={r.id}>{r.name} ({r.number})</option>)}</optgroup>)}</select>;
}

// -------------------------------------------------------------------------------------------------- requirements for one room
export function BuildView({ role, s, now, act, can, room }: Common & { room: string | null }) {
  const [id, setId] = useState(room && roomById(room) ? room : REFERENCE_ROOM_ID); const [access, setAccess] = useState<string[]>([]); const [assume, setAssume] = useState('');
  const rev = inForce(s); const rec = useMemo(() => roomRecord(id), [id]);
  const g = useMemo(() => (rec ? generate(rec, { values: rev.values, siteAdds: rev.siteAdds, access, assumptions: assume.split('\n') }) : null), [rec, rev, access, assume]);
  if (!rec || !g) return <Notice tone="warn">The estate has no such room.</Notice>;
  const chapters = byChapter(g); const never = g.requirements.filter((r) => r.noWaiver).length;
  return (<>
    <Card title="Choose the room, and what applies to it" icon="room" sub={`Made from revision ${rev.rev} of your edition and from the room’s own record.`} testId="mn-build">
      <div className="mn-form">
        <div className="ui-field mn-wide"><label htmlFor="mn-room">Room</label><RoomSelect id="mn-room" value={id} onChange={setId} testId="mn-room" /></div>
        <fieldset className="mn-set mn-wide"><legend>Accessibility constraints for this room</legend>{ACCESS.map((a) => <label key={a.id} className="mn-opt"><input type="checkbox" checked={access.includes(a.id)} onChange={(e) => setAccess(e.target.checked ? [...access, a.id] : access.filter((x) => x !== a.id))} data-testid={`mn-access-${a.id}`} /><span>{a.label}</span></label>)}</fieldset>
        <div className="ui-field mn-wide"><label htmlFor="mn-assume">Engineering assumptions, one to a line</label><textarea id="mn-assume" rows={3} maxLength={1200} value={assume} onChange={(e) => setAssume(e.target.value)} data-testid="mn-assume" /></div>
      </div>
      <dl className="mn-facts" data-testid="mn-room-facts" data-room={g.room}>
        <div><dt>Room</dt><dd><a href={roomHref(g.room)}>{g.roomName}</a>, {BUILDINGS.find((b) => b.key === g.building)?.name || g.building}</dd></div>
        <div><dt>Room type</dt><dd>{g.archetypeName}</dd></div><div><dt>Complexity</dt><dd>{g.tier}</dd></div><div><dt>Where the room is in its life</dt><dd>{words(g.lifecycle)}</dd></div>
      </dl>
    </Card>

    <Card title={g.gaps.length ? `${plural(g.gaps.length, 'gap')} between this set and a room that can be judged` : 'No gap was found'} icon={g.gaps.length ? 'alert' : 'check'} testId="mn-gaps">
      {g.gaps.length ? <ul className="mn-plain" data-count={g.gaps.length}>{g.gaps.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="mn-note">Every value this room depends on is set, the type’s required equipment is in the record, and the tests have the facts they need.</p>}
      {g.assumptions.length ? <div className="mn-assume" data-testid="mn-assumed"><span>Assumed by the engineer</span><ul className="mn-plain">{g.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></div> : null}
    </Card>

    <Card title={`Equipment (${g.equipment.length}) and the port profile proposed for each`} icon="layers" sub="What the room’s record holds. A profile is proposed from the kind of device; the network owner confirms it (rule N-06)." testId="mn-equipment">
      <div className="mn-scroll"><table className="mn-table"><thead><tr><th scope="col">Position</th><th scope="col">Kind</th><th scope="col">What is known of the unit</th><th scope="col">Identity</th><th scope="col">Port profile</th></tr></thead>
        <tbody>{g.equipment.map((e) => <tr key={e.code}><th scope="row">{e.code}</th><td>{e.label}</td><td>{e.device}</td><td>{words(e.identity)}</td><td>{e.profile ? PROFILES[e.profile] : <span className="mn-sub">No network port</span>}</td></tr>)}</tbody></table></div>
      {g.roles.length ? <div className="mn-assume" data-testid="mn-roles"><span>What {an(g.archetypeName.toLowerCase())} requires, and what may fill each need</span>
        <ul className="mn-plain">{g.roles.map((r) => <li key={r.role} data-role={r.role} data-filled={r.has.length ? 'yes' : 'no'}><b>{NEED_WORD[r.role] || r.role}.</b> May be filled by: {r.approved.join(', ').toLowerCase()}. {r.has.length ? `This room has: ${r.has.join(', ').toLowerCase()}.` : 'This room’s record has none.'}</li>)}</ul></div> : null}
    </Card>

    <Card title={`Design requirements (${g.requirements.length})`} icon="book" sub={`${chapters.map((c) => `${c.chapter} ${c.n}`).join(' · ')}. ${never} can never be excepted.`} testId="mn-reqs">
      <ol className="mn-reqs" data-count={g.requirements.length}>{g.requirements.map((r) => <li key={r.id} data-req={r.id} data-origin={r.origin} data-never={r.noWaiver ? 'yes' : 'no'}>
        <header><span className="mn-id">{r.id}</span><Chip small tone="muted">{r.chapter}</Chip>{r.origin === 'site' ? <Chip small tone="info">Building addition</Chip> : r.origin === 'access' ? <Chip small tone="info">Selected constraint</Chip> : null}{r.noWaiver ? <Chip small tone="bad" title={r.noWaiver}>Never excepted</Chip> : null}</header>
        <p className="mn-say">{r.text}</p><p className="mn-why">{r.because}{r.tests.length ? ` Checked at commissioning by: ${r.tests.map(testLabel).join('; ')}.` : ''}</p>
        {r.values.length ? <dl className="mn-vals">{r.values.map((v) => <div key={v.id} data-value={v.id} data-set={v.value ? 'yes' : 'no'}><dt>{v.name}</dt><dd>{v.value ? <><b>{v.value}</b> <span>Source: {v.source}</span></> : <span>Not set by your organisation.</span>}</dd></div>)}</dl> : null}</li>)}</ol>
    </Card>

    <Card title={`Commissioning template (${plural(g.template.length, 'test')})`} icon="check" sub={`The tests the commissioning engine applies to this room, with the catalogue’s method for each. ${plural(g.notApplicable, 'other test')} in the catalogue ${g.notApplicable === 1 ? 'does' : 'do'} not apply. A template holds no result.`} testId="mn-template">
      <div className="mn-scroll"><table className="mn-table" data-count={g.template.length}><thead><tr><th scope="col">Test</th><th scope="col">Who verifies</th><th scope="col">Method</th><th scope="col">Evidence accepted</th><th scope="col">Pass mark</th><th scope="col">State</th></tr></thead>
        <tbody>{g.template.map((t) => <tr key={t.id} data-test={t.id} data-status={t.status}><th scope="row">{t.label}<span className="mn-sub">{t.domain} · phase {t.phase}{t.nonwaivable ? ' · never waived' : ''}{t.principles.length ? ` · ${t.principles.join(', ')}` : ''}</span></th>
          <td>{words(t.verifier)}</td><td>{t.method}{t.instrument ? <span className="mn-sub">Needs an instrument.</span> : null}</td><td>{t.evidence.map(words).join(', ') || 'not stated'}</td>
          <td>{t.criteria.length ? t.criteria.map((c) => <span key={c.id} className="mn-sub" data-set={c.value ? 'yes' : 'no'}>{c.name}: {c.value ? <b>{c.value}</b> : 'not set'}</span>) : <span className="mn-sub">Met or not, as the method says</span>}</td>
          <td>{ENGINE_WORD[t.status] || words(t.status)}{t.missing.length ? <span className="mn-sub">Missing: {t.missing.join(', ')}</span> : null}</td></tr>)}</tbody></table></div>
    </Card>

    <div className="mn-row">{can('manual.set') ? <button type="button" className="ui-btn ui-btn--primary" data-testid="mn-save" onClick={() => act((n) => saveSet(n, role, g), `The set is saved for ${g.roomName}, from revision ${rev.rev}. Nothing is approved: another engineering role reviews it.`)}>Save this set for review</button>
      : <p className="mn-note" data-testid="mn-nosave">Saving a set is for the people who design the room. The {ROLES[role].label} reads it.</p>}<button type="button" className="ui-btn ui-btn--sm" onClick={() => window.print()}>Print or save as PDF</button></div>

    {s.sets.length ? <Card title={`Saved sets (${s.sets.length})`} icon="clock" testId="mn-sets"><ul className="mn-links">{s.sets.map((x) => { const st = setState(s, x, now); return <li key={x.id} data-set={x.id} data-state={st.state}><a href={`#/manual/set/${x.id}`}>{x.id} · {x.roomName}</a>
      <span>{SET_WORD[st.state]}: {st.met} met, {st.excepted} excepted, {st.notMet} not met, {st.open} to review. Revision {x.rev}, saved {day(x.at)} by the {ROLES[x.by].label}.</span></li>; })}</ul></Card> : null}
  </>);
}

// --------------------------------------------------------------------------------------------- a saved set and its findings
export function SetView({ role, s, now, act, can, id }: Common & { id: string }) {
  const set = s.sets.find((x) => x.id === id); const [notes, setNotes] = useState<Record<string, string>>({});
  if (!set) return <Notice tone="warn"><span data-testid="mn-noset">No set is saved under that number. <a href="#/manual/build">Make one for a room.</a></span></Notice>;
  const st = setState(s, set, now); const mayFind = can('manual.decide') && set.by !== role; const stale = inForce(s).rev !== set.rev;
  const find = (req: string, met: boolean) => { if (act((n) => recordFinding(n, role, set.id, req, met, notes[req] || ''), `${req} is recorded as ${met ? 'met' : 'not met'}, with what you saw.`)) setNotes({ ...notes, [req]: '' }); };
  return (<>
    <Card title={`${set.id} · ${set.roomName}`} icon="book" sub={`${set.archetypeName}. Saved ${day(set.at)} by the ${ROLES[set.by].label}, from revision ${set.rev} of the edition.`} testId="mn-set" action={<Chip small tone={st.state === 'REVIEWED' ? 'ok' : st.state === 'NOT_MET' ? 'bad' : 'info'}>{SET_WORD[st.state]}</Chip>}>
      <p className="mn-note" data-testid="mn-set-counts" data-state={st.state} data-met={st.met} data-open={st.open} data-notmet={st.notMet} data-excepted={st.excepted}>{st.met} met · {st.excepted} under an approved exception · {st.notMet} not met · {st.open} still to review. {plural(set.tests.length, 'test')} in its commissioning template; {plural(set.gaps, 'gap')} stated when it was saved.</p>
      {stale ? <p className="mn-note" data-testid="mn-set-stale">The edition is now at revision {inForce(s).rev}. This set is judged against revision {set.rev}, the one in force when it was made.</p> : null}
      <p className="mn-note" data-testid="mn-set-who">{mayFind ? 'You may record whether each requirement is met. Write what you saw: the drawing, the sheet or the record that shows it.' : set.by === role ? `The ${ROLES[role].label} saved this set, so another engineering role reviews it. Nobody reviews their own.` : `Whether a requirement is met is an engineer’s finding. The ${ROLES[role].label} reads this set.`}</p>
      <p className="mn-note">A reviewed set is not an accepted room. Acceptance comes from commissioning evidence: <a href={`#/commissioning/room/${set.room}`}>open the room’s commissioning</a>.</p>
      {set.assumptions.length ? <div className="mn-assume"><span>Assumed by the engineer</span><ul className="mn-plain">{set.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></div> : null}
    </Card>
    <ol className="mn-reqs" data-testid="mn-set-rows">{set.requirements.map((r) => { const k = rowState(s, set, r.id, now); const f = set.findings[r.id]; const p = principleById(r.id); const ex = s.exceptions.find((e) => e.room === set.room && e.principle === r.id && exceptionState(e, now) === 'APPROVED'); return (
      <li key={r.id} data-req={r.id} data-state={k} data-never={r.noWaiver ? 'yes' : 'no'}>
        <header><span className="mn-id">{r.id}</span><Chip small tone={ROW_TONE[k]}>{ROW_WORD[k]}</Chip>{r.noWaiver ? <Chip small tone="bad">Never excepted</Chip> : null}</header>
        <p className="mn-say">{r.text}</p>
        {f ? <p className="mn-why" data-testid={`mn-found-${r.id}`}>Found {f.met ? 'met' : 'not met'} by the {ROLES[f.by].label}, {day(f.at)}: “{f.note}”</p> : null}
        {k === 'EXCEPTED' && ex ? <p className="mn-why">Covered by <a href="#/manual/exceptions">{ex.id}</a> until {day(ex.until)}.</p> : null}
        {mayFind ? <div className="mn-find"><div className="ui-field"><label htmlFor={`mn-f-${r.id}`}>What you saw</label><input id={`mn-f-${r.id}`} type="text" maxLength={400} value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} data-testid={`mn-note-${r.id}`} autoComplete="off" /></div>
          <button type="button" className="ui-btn ui-btn--sm" data-testid={`mn-met-${r.id}`} onClick={() => find(r.id, true)}>Met</button><button type="button" className="ui-btn ui-btn--sm" data-testid={`mn-notmet-${r.id}`} onClick={() => find(r.id, false)}>Not met</button></div> : null}
        {k === 'NOT_MET' && p && !r.noWaiver && can('manual.exception') ? <p className="mn-ask"><a href={`#/manual/exceptions?rule=${r.id}&room=${set.room}`}>Ask for an exception to {r.id} in this room</a></p> : null}
      </li>); })}</ol>
  </>);
}

// --------------------------------------------------------------------------------------------------------------- exceptions
export function ExceptionsView({ role, s, now, act, can, rule, room }: Common & { rule: string | null; room: string | null }) {
  const askable = useMemo(() => ALL_PRINCIPLES.filter((p) => !neverExcepted(p)), []); const mayAsk = can('manual.exception'); const mayDecide = can('manual.decide');
  const [r, setR] = useState(room && roomById(room) ? room : REFERENCE_ROOM_ID); const [p, setP] = useState(rule && askable.some((x) => x.id === rule) ? rule : askable[0]!.id); const [kind, setKind] = useState<ExceptionKind>('temporary');
  const [f, setF] = useState({ reason: '', risk: '', mitigation: '', wayBack: '', until: '' }); const [notes, setNotes] = useState<Record<string, string>>({});
  const blocked = rule && principleById(rule) ? neverExcepted(principleById(rule)!) : null; const rep = repeated(s);
  const field = (k: keyof typeof f, label: string, hint?: string) => <div className="ui-field mn-wide"><label htmlFor={`mn-x-${k}`}>{label}</label><input id={`mn-x-${k}`} type="text" maxLength={k === 'reason' ? 400 : 300} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} data-testid={`mn-x-${k}`} autoComplete="off" aria-describedby={hint ? `mn-x-${k}-h` : undefined} />{hint ? <span className="mn-sub" id={`mn-x-${k}-h`}>{hint}</span> : null}</div>;
  return (<>
    {blocked ? <Notice tone="warn"><span data-testid="mn-x-blocked">{rule} is never excepted. {blocked}</span></Notice> : null}
    <Card title="Ask for an exception" icon="alert" sub="In writing, before anything is built. It is decided by an engineering role other than the one that asks." testId="mn-x-ask">
      {mayAsk ? <form className="mn-form" onSubmit={(e) => { e.preventDefault(); if (act((n) => requestException(n, role, { room: r, principle: p, kind, ...f, until: f.until ? `${f.until}T23:59:59Z` : '' }), 'The exception is asked for. Nothing is approved until another engineering role decides it.')) setF({ reason: '', risk: '', mitigation: '', wayBack: '', until: '' }); }} data-testid="mn-x-form">
        <div className="ui-field"><label htmlFor="mn-x-room">Room</label><RoomSelect id="mn-x-room" value={r} onChange={setR} testId="mn-x-room" /></div>
        <div className="ui-field"><label htmlFor="mn-x-rule">The rule the room would depart from</label><select id="mn-x-rule" value={p} onChange={(e) => setP(e.target.value)} data-testid="mn-x-rule">{askable.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.say.slice(0, 70)}</option>)}</select></div>
        <p className="mn-note mn-wide" data-testid="mn-x-text">{principleById(p)?.say}</p>
        {field('reason', 'The technical reason', 'Convenience, a deadline or a supplier’s preference is not, alone, a reason.')}{field('risk', 'What the room risks')}{field('mitigation', 'What reduces that risk')}
        <fieldset className="mn-set"><legend>How long</legend>{(['temporary', 'permanent'] as const).map((k) => <label key={k} className="mn-opt"><input type="radio" name="mn-x-kind" checked={kind === k} onChange={() => setKind(k)} data-testid={`mn-x-${k}`} /><span>{k === 'temporary' ? 'Temporary: it ends on a date' : 'Permanent: it is looked at again on a date'}</span></label>)}</fieldset>
        <div className="ui-field"><label htmlFor="mn-x-until">{kind === 'temporary' ? 'It ends on' : 'It is looked at again on'}</label><input id="mn-x-until" type="date" value={f.until} onChange={(e) => setF({ ...f, until: e.target.value })} data-testid="mn-x-until" /></div>
        {kind === 'temporary' ? field('wayBack', 'How the room returns to the standard') : null}
        <button type="submit" className="ui-btn ui-btn--primary" data-testid="mn-x-go">Ask for the exception</button></form>
        : <p className="mn-note" data-testid="mn-x-noask">An exception is asked for by the people who design the room. The {ROLES[role].label} reads them.</p>}
      <p className="mn-note" data-testid="mn-x-never">{ALL_PRINCIPLES.length - askable.length} of the manual’s {ALL_PRINCIPLES.length} rules cannot be chosen here: they are never excepted.</p>
    </Card>

    {rep.length ? <Notice tone="warn"><span data-testid="mn-x-repeated">The same rule excepted again and again is a sign the standard should change (rule E-06): {rep.map((x) => `${x.principle}, ${x.n} times`).join('; ')}.</span></Notice> : null}

    <section className="mn-exlist" aria-labelledby="mn-x-h" data-testid="mn-x-list" data-count={s.exceptions.length}><h2 id="mn-x-h">Exceptions on record ({s.exceptions.length})</h2>
      {s.exceptions.length ? s.exceptions.map((e) => { const st = exceptionState(e, now); const own = e.by === role; return (
        <article key={e.id} className="mn-ex" data-testid={`mn-x-${e.id}`} data-state={st} aria-labelledby={`mn-xh-${e.id}`}>
          <header><h3 id={`mn-xh-${e.id}`}>{e.id} · {e.principle} in <a href={roomHref(e.room)}>{roomById(e.room)?.name || e.room}</a></h3><Chip small tone={EX_TONE[st]}>{EX_WORD[st]}</Chip><Chip small tone="muted">{e.kind === 'temporary' ? `Temporary, until ${day(e.until)}` : `Permanent, looked at again ${day(e.until)}`}</Chip></header>
          <p className="mn-say">{principleById(e.principle)?.say}</p>
          <dl className="mn-facts"><div><dt>Reason</dt><dd>{e.reason}</dd></div><div><dt>Risk</dt><dd>{e.risk}</dd></div><div><dt>What reduces it</dt><dd>{e.mitigation}</dd></div>{e.wayBack ? <div><dt>The way back</dt><dd>{e.wayBack}</dd></div> : null}</dl>
          <p className="mn-why">Asked for {day(e.at)} by the {ROLES[e.by].label}.{e.decision ? ` ${e.decision.approved ? 'Approved' : 'Refused'} ${day(e.decision.at)} by the ${ROLES[e.decision.by].label}: “${e.decision.note}”` : ''}{e.closed ? ` Closed ${day(e.closed.at)} by the ${ROLES[e.closed.by].label}: “${e.closed.note}”` : ''}</p>
          {st === 'LAPSED' ? <p className="mn-never" data-testid={`mn-x-lapsed-${e.id}`}>Its date has passed and the room has not been recorded as back on the standard. Until it is closed or asked for again, this is a failure of governance (rule E-03).</p> : null}
          {st === 'REQUESTED' ? (mayDecide && !own ? <div className="mn-find"><div className="ui-field"><label htmlFor={`mn-xd-${e.id}`}>Your decision, and why</label><input id={`mn-xd-${e.id}`} type="text" maxLength={400} value={notes[e.id] || ''} onChange={(ev) => setNotes({ ...notes, [e.id]: ev.target.value })} data-testid={`mn-x-note-${e.id}`} autoComplete="off" /></div>
            <button type="button" className="ui-btn ui-btn--sm" data-testid={`mn-x-approve-${e.id}`} onClick={() => act((n) => decideException(n, role, e.id, true, notes[e.id] || ''), `${e.id} is approved, until its date.`)}>Approve</button><button type="button" className="ui-btn ui-btn--sm" data-testid={`mn-x-refuse-${e.id}`} onClick={() => act((n) => decideException(n, role, e.id, false, notes[e.id] || ''), `${e.id} is refused.`)}>Refuse</button></div>
            : <p className="mn-note" data-testid={`mn-x-wait-${e.id}`}>{own && mayDecide ? `The ${ROLES[role].label} asked for this, so another engineering role decides it. Nobody approves their own.` : 'It waits for an engineer who may decide a design.'}</p>) : null}
          {(st === 'APPROVED' || st === 'LAPSED') && (mayAsk || mayDecide) ? <div className="mn-find"><div className="ui-field"><label htmlFor={`mn-xc-${e.id}`}>How the room returned to the standard</label><input id={`mn-xc-${e.id}`} type="text" maxLength={300} value={notes[`c-${e.id}`] || ''} onChange={(ev) => setNotes({ ...notes, [`c-${e.id}`]: ev.target.value })} data-testid={`mn-x-closenote-${e.id}`} autoComplete="off" /></div>
            <button type="button" className="ui-btn ui-btn--sm" data-testid={`mn-x-close-${e.id}`} onClick={() => act((n) => closeException(n, role, e.id, notes[`c-${e.id}`] || ''), `${e.id} is closed.`)}>Close the exception</button></div> : null}
        </article>); }) : <p className="mn-note">No exception has been asked for.</p>}
    </section>
  </>);
}
