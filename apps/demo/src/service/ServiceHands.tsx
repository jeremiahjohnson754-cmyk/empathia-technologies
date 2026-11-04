/**
 * ServiceHands (#/servicehands): request → intake → triage → matching → assignment → dispatch → execution → evidence → validation →
 * resolution → closure → learning, on the shared demonstration workspace. #/servicehands/new is the structured intake (who reports,
 * the room and asset, the category, guided troubleshooting, placeholder attachments); #/servicehands/wo/<id> is the work order, with the
 * technician's mobile-first workspace (instructions, safety, preflight, parts, notes, blockers, escalation, evidence, FI findings), the
 * independent verification, the resolution, the closure (which says plainly that a closed ticket is not recommissioning) and learning.
 */
import { useMemo, useState } from 'react';
import { WORK_NEEDS } from '@empathia/service-engine';
import { Tag } from '@empathia/ui';
import * as S from '../workspace/store.js';
import type { WorkspaceProps } from '../hardening/lazy.js';
import { OpsHead, Refused, NotYours, holds, param, when, personaLabel, sh, type WX } from '../hardening/kit.js';
import { useOps } from '../hardening/useOps.js';
import { opsPath } from '../hardening/path.js';
import { useConfirm, useUndo } from '../safeguards/Safeguards.js';
import { ROOMS, roomOf, findingsOf, PROVENANCE_TEXT } from '../fi/rooms.js';
import { CATEGORIES, ENTRY_POINTS, RESOLUTION_CODES, BAND_OF, ATTACH_PLACEHOLDERS, STAGES, stageOf, intakeErrors, submitRequest, addNote, clearBlocker, attachFinding, recordResolution, closeIncident, cancelWorkOrder, type IntakeInput } from './actions.js';

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { OPEN: 'warn', TRIAGED: 'info', ASSIGNED: 'info', ACCEPTED: 'info', IN_PROGRESS: 'info', VERIFYING: 'warn', RESOLVED: 'ok', CLOSED: 'muted', REOPENED: 'bad', CANCELLED: 'muted' };
type Ops = ReturnType<typeof useOps>;

export default function ServiceHands({ perspective, hash }: WorkspaceProps) {
  const ops = useOps(perspective); const p = opsPath(hash);
  const confirm = useConfirm(); const undo = useUndo();
  let body;
  if (p[1] === 'new') body = <Intake ops={ops} hash={hash} />;
  else if (p[1] === 'wo' && p[2]) { const wo = S.workOrderOf(ops.w, p[2]); const inc = wo ? S.incidentOf(ops.w, wo.incidentId) : undefined; body = inc ? <Job ops={ops} inc={inc} confirm={confirm.ask} offerUndo={undo.offer} /> : <Missing what={`work order ${p[2]}`} />; }
  else if (param(hash, 'id')) { const inc = S.incidentOf(ops.w, param(hash, 'id')!); body = inc ? <Job ops={ops} inc={inc} confirm={confirm.ask} offerUndo={undo.offer} /> : <Missing what={`incident ${param(hash, 'id')}`} />; }
  else body = <Home ops={ops} />;
  return <section className="ops" data-testid="servicehands">{body}{undo.bar}{confirm.dialog}</section>;
}
function Missing({ what }: { what: string }) { return <div className="ops-card" role="alert"><h1>Not found</h1><p>There is no {what} in this demonstration workspace. It may have been reset. <a href="#/servicehands">Back to ServiceHands</a></p></div>; }

function Home({ ops }: { ops: Ops }) {
  const { w, persona } = ops; const me = S.techForPersona(persona);
  const mine = me ? w.incidents.filter((i) => i.workOrderId && S.workOrderOf(w, i.workOrderId)?.techId === me && !['CLOSED', 'CANCELLED'].includes(i.state)) : [];
  const list = [...w.incidents].sort((a, b) => (['CLOSED', 'CANCELLED'].includes(a.state) ? 1 : 0) - (['CLOSED', 'CANCELLED'].includes(b.state) ? 1 : 0) || b.openedAt.localeCompare(a.openedAt));
  const canReport = ['request.submit', 'service.triage', 'work.evidence'].some((a) => holds(persona, a));
  return (<>
    <OpsHead product="servicehands" kicker="ServiceHands · incident to service" title="ServiceHands" persona={persona}
      lead={<>Every job moves through twelve stages, one governed step at a time; the person who did the work never verifies it.</>}
      actions={<>{canReport && <a className="ui-btn ui-btn--primary" href="#/servicehands/new" data-testid="report">Report a problem</a>}{holds(persona, 'service.assign') && <a className="ui-btn" href="#/service">Dispatch board</a>}</>} />
    <ol className="ops-strip" aria-label="The twelve stages of a service job">{STAGES.map((s) => <li key={s}>{s}</li>)}</ol>
    {me && <section className="ops-card" aria-labelledby="mine-h" data-testid="my-jobs"><h2 id="mine-h">My jobs · {S.techOf(w, me)?.name}</h2>
      {mine.length ? <ul className="ops-list">{mine.map((i) => <JobLine key={i.id} w={w} i={i} />)}</ul> : <p className="ops-note">Nothing is assigned to you right now.</p>}</section>}
    <section className="ops-card" aria-labelledby="all-h"><h2 id="all-h">All service jobs</h2><ul className="ops-list" data-testid="jobs">{list.map((i) => <JobLine key={i.id} w={w} i={i} />)}</ul></section>
  </>);
}
function JobLine({ w, i }: { w: WX; i: S.Incident }) {
  const href = i.workOrderId ? `#/servicehands/wo/${i.workOrderId}` : `#/servicehands?id=${i.id}`;
  return <li><a href={href} className="ops-job" data-job={i.id}><b>{i.title}</b><span className="ops-meta">{i.id}{i.workOrderId ? ` · ${i.workOrderId}` : ''} · {i.roomName}</span><span className="ops-row"><Tag tone={TONE[i.state]}>{i.state}</Tag><span className="ops-meta">stage: {STAGES[stageOf(w, i)]}</span></span></a></li>;
}

function Intake({ ops, hash }: { ops: Ops; hash: string }) {
  const { persona } = ops;
  const [f, setF] = useState<IntakeInput>({ entry: S.techForPersona(persona) ? 'technician' : 'employee', roomId: param(hash, 'room') || '', category: '', assetId: null, title: '', summary: '', answers: [], attachments: [] });
  const [tried, setTried] = useState(false); const [done, setDone] = useState<string | null>(null);
  const errs = intakeErrors(f); const room = roomOf(f.roomId); const qs = CATEGORIES[f.category]?.questions || [];
  const canReport = ['request.submit', 'service.triage', 'work.evidence'].some((a) => holds(persona, a));
  const set = (k: keyof IntakeInput, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const submit = () => {
    setTried(true);
    if (Object.keys(errs).length) { setTimeout(() => (document.querySelector('[aria-invalid=true]') as HTMLElement | null)?.focus(), 0); return; }
    const r = ops.apply((x) => submitRequest(x, persona, f)); if (r && 'id' in r) setDone(r.id);
  };
  const err = (k: string) => (tried && errs[k] ? <span className="ui-field__error" id={`in-${k}-e`}>{errs[k]}</span> : null);
  const inv = (k: string) => ({ 'aria-invalid': tried && !!errs[k] ? true : undefined, 'aria-describedby': tried && errs[k] ? `in-${k}-e` : undefined });
  if (done) return (<>
    <OpsHead product="servicehands" kicker="ServiceHands · intake" title="Problem reported" persona={persona} />
    <div className="ops-card" role="status" data-testid="intake-done"><h2>{done} is in the service queue</h2><p className="ops-note">A service manager triages it next: severity, then who may do the work. You can follow it here; nothing has been sent anywhere outside this demonstration.</p>
      <p className="ops-row"><a className="ui-btn ui-btn--primary" href={`#/servicehands?id=${done}`}>Follow {done}</a><button type="button" className="ui-btn" onClick={() => { setDone(null); setTried(false); setF({ ...f, title: '', summary: '', answers: [], attachments: [] }); }}>Report another</button></p></div></>);
  return (<>
    <OpsHead product="servicehands" kicker="ServiceHands · intake" title="Report a problem" persona={persona} lead={<>A few structured answers save the technician a visit. Attachments here are synthetic placeholders: this demonstration takes no files.</>} />
    {!canReport ? <NotYours who="employee, technician or service manager" what="Reporting a problem" /> : (
    <form className="ops-card ops-form" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }} data-testid="intake">
      <fieldset className="ops-form"><legend>Who is reporting</legend><div className="ops-row">{Object.entries(ENTRY_POINTS).map(([k, l]) => <label key={k} className="check"><input type="radio" name="entry" checked={f.entry === k} onChange={() => set('entry', k)} /> {l}</label>)}</div>{err('entry')}</fieldset>
      <label className="ops-field">Room<select value={f.roomId} onChange={(e) => setF({ ...f, roomId: e.target.value, assetId: null })} {...inv('roomId')} data-testid="in-room"><option value="">Choose the room…</option>{ROOMS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>{err('roomId')}</label>
      {room && room.positions.length > 0 && <label className="ops-field">Device, if you know it <span className="ops-meta">(optional)</span><select value={f.assetId || ''} onChange={(e) => set('assetId', e.target.value || null)}><option value="">Not sure</option>{room.positions.map((p) => <option key={p.pa} value={p.asset}>{p.label} ({p.asset})</option>)}</select></label>}
      <label className="ops-field">What kind of problem<select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, answers: [] })} {...inv('category')} data-testid="in-category"><option value="">Choose…</option>{Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}</select>{err('category')}</label>
      {qs.length > 0 && <fieldset className="ops-form" data-testid="troubleshoot"><legend>Quick checks</legend>{qs.map((q, i) => <div key={q} className="ops-field"><span>{q}</span><div className="ops-row" role="radiogroup" aria-label={q}>{['Yes', 'No', 'Not sure'].map((a) => <label key={a} className="check"><input type="radio" name={`q${i}`} checked={f.answers[i]?.[1] === a} onChange={() => { const n = [...f.answers]; n[i] = [q, a]; set('answers', n); }} /> {a}</label>)}</div></div>)}</fieldset>}
      <label className="ops-field">What people experience<input type="text" value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={140} {...inv('title')} data-testid="in-title" />{err('title')}</label>
      <label className="ops-field">When, how often, who noticed <span className="ops-meta">(optional, {f.summary.length}/600)</span><textarea rows={3} value={f.summary} onChange={(e) => set('summary', e.target.value)} {...inv('summary')} />{err('summary')}</label>
      <fieldset className="ops-form"><legend>Attachments (synthetic placeholders)</legend><div className="ops-row">{ATTACH_PLACEHOLDERS.map((a) => <label key={a} className="check"><input type="checkbox" checked={f.attachments.includes(a)} onChange={(e) => set('attachments', e.target.checked ? [...f.attachments, a] : f.attachments.filter((x) => x !== a))} /> {a}</label>)}</div></fieldset>
      {tried && Object.keys(errs).length > 0 && <p className="ops-refused" role="alert">{Object.keys(errs).length} thing{Object.keys(errs).length > 1 ? 's' : ''} to fix before this can be reported.</p>}
      <Refused r={ops.refusal} />
      <div className="ops-row"><button type="submit" className="ui-btn ui-btn--primary" data-testid="in-submit">Report the problem</button><a className="ui-btn ui-btn--quiet" href="#/servicehands">Cancel</a></div>
    </form>)}
  </>);
}

function Job({ ops, inc, confirm, offerUndo }: { ops: Ops; inc: S.Incident; confirm: ReturnType<typeof useConfirm>['ask']; offerUndo: ReturnType<typeof useUndo>['offer'] }) {
  const { w, persona } = ops; const wo = inc.workOrderId ? S.workOrderOf(w, inc.workOrderId) : undefined;
  const me = S.techForPersona(persona); const mine = !!wo && !!me && wo.techId === me; const tech = S.techOf(w, wo?.techId || null);
  const st = stageOf(w, inc); const X = sh(w); const intake = X.intake[inc.id]; const res = X.resolution[inc.id];
  const notes = wo ? X.notes[wo.id] || [] : []; const fiev = wo ? X.fiEvidence[wo.id] || [] : []; const cancelled = wo ? X.cancelled[wo.id] : undefined;
  const needs = wo ? WORK_NEEDS[wo.workType] || WORK_NEEDS['break_fix']! : null;
  const [pf, setPf] = useState({ access: false, safety: false, heightPermit: false, tools: [] as string[] });
  const [ev, setEv] = useState({ kind: 'photo', note: '' }); const [note, setNote] = useState({ kind: 'note' as 'note' | 'blocker' | 'escalation' | 'part', text: '' });
  const [rc, setRc] = useState({ code: res?.code || '', root: res?.rootCause || '' }); const [conf, setConf] = useState(false); const [reopen, setReopen] = useState('');
  const findings = useMemo(() => findingsOf(inc.roomId), [inc.roomId]);
  const preview = wo && inc.state === 'ACCEPTED' ? S.preflightFor(w, wo.id, pf) : null;
  const prior = w.incidents.filter((i) => i.roomId === inc.roomId && i.id !== inc.id);
  const band = BAND_OF[wo?.workType || 'break_fix'] || BAND_OF['break_fix']!;
  const replacement = wo && ['camera_replacement', 'lifecycle_replacement'].includes(wo.workType) || res?.code === 'RC-REPLACE';
  const isRef = (r: unknown) => !!r && typeof r === 'object' && 'why' in (r as object);
  return (<>
    <OpsHead product="servicehands" kicker={`ServiceHands · ${wo ? `work order ${wo.id}` : `incident ${inc.id}`}`} title={inc.title} persona={persona}
      lead={<><Tag tone={TONE[inc.state]}>{inc.state}</Tag> {inc.roomName} · {inc.severity}{tech ? ` · ${tech.name}` : ''}</>}
      actions={<a className="ui-btn ui-btn--quiet" href="#/servicehands">All jobs</a>} />
    <ol className="ops-strip" aria-label="Stage of this job" data-testid="stages">{STAGES.map((s, i) => <li key={s} className={i < st ? 'done' : i === st ? 'on' : ''} aria-current={i === st ? 'step' : undefined}>{s}</li>)}</ol>
    <Refused r={ops.refusal} />
    {cancelled && <p className="ops-refused" role="status">Work order cancelled by {personaLabel(cancelled.by)} on {when(cancelled.at)}: {cancelled.reason}. The record and its history are kept.</p>}
    <div className="ops-grid ops-grid--2b">
      <div className="ops-grid">
        {/* the technician's workspace comes first: on a phone it is the whole page above the fold */}
        {wo && mine && ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(inc.state) && needs && (
          <section className="ops-card" aria-labelledby="tw-h" data-testid="tech-workspace"><h2 id="tw-h">Your job</h2>
            <dl className="ops-kv"><dt>Instructions</dt><dd>{wo.title}. Restore the room to its commissioned behaviour; change nothing that is not needed for the fix.</dd>
              <dt>Safety</dt><dd>Brief with the site champion before entering; {needs.certs.includes('lic.working_at_height') ? 'working at height: permit and a second person' : 'no work at height planned'}; leave the room as you found it.</dd>
              <dt>Tools</dt><dd>{needs.tools.join(', ') || 'none listed'}</dd><dt>Parts</dt><dd>{(wo.parts.length ? wo.parts.map((x) => `${x.qty} × ${x.part}`) : needs.parts).join(', ') || 'none'}</dd>
              <dt>Escalate to</dt><dd>Service Manager (synthetic) — write an escalation note below; it reaches the dispatch board's ledger</dd></dl>
            {inc.state === 'ASSIGNED' && <button type="button" className="ui-btn ui-btn--primary" onClick={() => ops.apply((x) => S.accept(x, persona, inc.id))} data-testid="accept">Accept the job</button>}
            {inc.state === 'ACCEPTED' && preview && <div className="ops-form" data-testid="preflight"><h3>Before you start</h3>
              <label className="check"><input type="checkbox" checked={pf.access} onChange={(e) => setPf({ ...pf, access: e.target.checked })} /> Site access confirmed by facilities or the site champion</label>
              <label className="check"><input type="checkbox" checked={pf.safety} onChange={(e) => setPf({ ...pf, safety: e.target.checked })} /> Safety brief acknowledged</label>
              {needs.certs.includes('lic.working_at_height') && <label className="check"><input type="checkbox" checked={pf.heightPermit} onChange={(e) => setPf({ ...pf, heightPermit: e.target.checked })} /> Working-at-height permit</label>}
              {needs.tools.map((tl) => <label key={tl} className="check"><input type="checkbox" checked={pf.tools.includes(tl)} onChange={(e) => setPf({ ...pf, tools: e.target.checked ? [...pf.tools, tl] : pf.tools.filter((x) => x !== tl) })} /> Tool: {tl}</label>)}
              <ul className="ops-list">{preview.checks.map((c) => <li key={c.id} className={c.ok ? 'ops-ok' : 'ops-fail'}><b>{c.label}</b> <span className="ops-meta">{c.why}</span></li>)}</ul>
              <button type="button" className="ui-btn ui-btn--primary" onClick={() => ops.apply((x) => S.start(x, persona, inc.id, pf))} data-testid="start">Start the work{preview.ok ? '' : ' (the preflight still blocks)'}</button></div>}
            {['ACCEPTED', 'IN_PROGRESS'].includes(inc.state) && <div className="ops-form"><h3>Field notes, blockers, escalation</h3>
              <div className="ops-row"><select aria-label="Kind of note" value={note.kind} onChange={(e) => setNote({ ...note, kind: e.target.value as typeof note.kind })}><option value="note">Note</option><option value="blocker">Blocker</option><option value="escalation">Escalation</option><option value="part">Part used</option></select>
                <input type="text" aria-label="Note" value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} placeholder="what you found, need or used" data-testid="note-text" />
                <button type="button" className="ui-btn" onClick={() => { if (!isRef(ops.apply((x) => addNote(x, persona, inc.id, note.kind, note.text)))) setNote({ ...note, text: '' }); }} data-testid="note-add">Add</button></div></div>}
            {inc.state === 'IN_PROGRESS' && <div className="ops-form"><h3>Evidence</h3>
              <div className="ops-row"><select aria-label="Evidence kind" value={ev.kind} onChange={(e) => setEv({ ...ev, kind: e.target.value })}>{['photo', 'configuration snapshot', 'test content', 'observation'].map((k) => <option key={k}>{k}</option>)}</select>
                <input type="text" aria-label="What was observed or changed" value={ev.note} onChange={(e) => setEv({ ...ev, note: e.target.value })} placeholder="what was observed or changed (synthetic)" data-testid="ev-note" />
                <button type="button" className="ui-btn" onClick={() => { if (!isRef(ops.apply((x) => S.recordEvidence(x, persona, inc.id, ev.kind, ev.note)))) setEv({ ...ev, note: '' }); }} data-testid="ev-add">Record evidence</button></div>
              <details data-testid="fi-attach"><summary>Field Intelligence findings for this room ({findings.length})</summary><ul className="ops-list">{findings.map((f) => <li key={f.id} className="ops-row"><span className={`ops-prov ops-prov--${f.provenance}`} title={PROVENANCE_TEXT[f.provenance]}>{f.provenance}</span><span className="ops-note">{f.text}</span>
                <button type="button" className="ui-btn ui-btn--sm" disabled={fiev.some((x) => x.findingId === f.id)} onClick={() => ops.apply((x) => attachFinding(x, persona, inc.id, f))} data-testid="fi-attach-btn">{fiev.some((x) => x.findingId === f.id) ? 'Attached' : 'Attach as evidence'}</button></li>)}</ul>
                <p className="ops-meta"><a href={`#/v25/fi/scan/${inc.roomId}`}>Open the room's scan replay</a> · a scan replay is simulated, never a measurement.</p></details>
              <button type="button" className="ui-btn ui-btn--primary" onClick={() => ops.apply((x) => S.submitForVerification(x, persona, inc.id))} data-testid="handover">Hand over for independent verification ({wo.evidence.length} evidence)</button></div>}
          </section>)}
        {wo && !mine && ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(inc.state) && <div className="ops-card"><h2>Field work</h2><p className="ops-note">{tech ? `${tech.name} has this job (${inc.state}).` : 'No technician yet.'}</p><NotYours who={`assigned technician${tech ? ` (${tech.name})` : ''}`} what="The field workspace" /></div>}
        {inc.state === 'VERIFYING' && <section className="ops-card" aria-labelledby="vf-h"><h2 id="vf-h">Independent verification</h2><p className="ops-note">{wo?.evidence.length || 0} evidence item(s) recorded by {tech?.name || 'the technician'}. The verifier is never the person who did the work.</p>
          {holds(persona, 'service.verify') ? <button type="button" className="ui-btn ui-btn--primary" onClick={() => ops.apply((x) => S.verify(x, persona, inc.id))} data-testid="verify">Verify the repair</button> : <NotYours who="Commissioning Engineer" what="Verification" />}</section>}
        {['IN_PROGRESS', 'VERIFYING', 'RESOLVED'].includes(inc.state) && (holds(persona, 'work.evidence') && mine || holds(persona, 'service.close')) && (
          <section className="ops-card" aria-labelledby="rs-h" data-testid="resolution"><h2 id="rs-h">Resolution</h2>
            <label className="ops-field">Resolution code<select value={rc.code} onChange={(e) => setRc({ ...rc, code: e.target.value })} data-testid="rc-code"><option value="">Choose…</option>{Object.entries(RESOLUTION_CODES).map(([k, l]) => <option key={k} value={k}>{k} · {l}</option>)}</select></label>
            <label className="ops-field">Root cause<textarea rows={2} value={rc.root} onChange={(e) => setRc({ ...rc, root: e.target.value })} data-testid="rc-root" /></label>
            <button type="button" className="ui-btn" onClick={() => ops.apply((x) => recordResolution(x, persona, inc.id, rc.code, rc.root))} data-testid="rc-save">{res ? 'Update the resolution' : 'Record the resolution'}</button>
            {res && <p className="ops-meta">Recorded by {personaLabel(res.by)} {when(res.at)}: {res.code} — {res.rootCause}</p>}</section>)}
        {inc.state === 'RESOLVED' && <section className="ops-card" aria-labelledby="cl-h" data-testid="closure"><h2 id="cl-h">Closure</h2>
          <p className="ops-note"><b>A closed ticket is not recommissioning.</b> Closing records that the service request is satisfied; it does not re-accept the room against its baseline. {replacement
            ? <>This repair replaced a unit: the shared reverification rule decides which commissioning tests reopen and who verifies them independently — see <a href={`#/replay/${inc.roomId}`}>Core Replay</a> for the room's replacement history.</>
            : <>If the repair changed the room beyond a like-for-like fix, it goes to <b>pending change management</b> (task #338, not authorized) — never silently into the baseline.</>}</p>
          {holds(persona, 'service.close') ? <>
            <label className="check"><input type="checkbox" checked={conf} onChange={(e) => setConf(e.target.checked)} data-testid="cl-confirmed" /> The requester confirmed the fix{inc.severity !== 'Standard' ? ' (required by the customer policy for this severity)' : ''}</label>
            <div className="ops-row"><button type="button" className="ui-btn ui-btn--primary" data-testid="close" onClick={() => confirm({ key: 'servicehands.close', title: `Close ${inc.id}?`, object: inc.id, actionLabel: 'Close the incident', consequence: <>The incident leaves the service queue with its resolution {res ? `(${res.code})` : '(not recorded yet — the close will be refused)'}. It comes back only by reopening it with a reason.</>, onConfirm: () => ops.apply((x) => closeIncident(x, persona, inc.id, conf)) })}>Close…</button>
              <input type="text" aria-label="Reopen reason" value={reopen} onChange={(e) => setReopen(e.target.value)} placeholder="recurrence or failed verification" /><button type="button" className="ui-btn" onClick={() => ops.apply((x) => S.reopen(x, persona, inc.id, reopen))} data-testid="reopen">Reopen</button></div></> : <NotYours who="Service Manager" what="Closing" />}</section>}
        {['RESOLVED', 'CLOSED'].includes(inc.state) && <section className="ops-card" aria-labelledby="ln-h" data-testid="learning"><h2 id="ln-h">Operational learning</h2>
          <p className="ops-note">Recommended Learn band <b>{band.band}</b> — {band.why}. <span className="ops-meta">The band comes from the technical subject of the work (the demonstration's rule), not from an assessment of anyone.</span></p>
          <p className="ops-note">A lab completed afterwards is <b>competency evidence</b> on the person's internal competency record — not a credential, and never an authorization to work.</p>
          <p className="ops-row">{inc.learnCaseId ? <a href={`#/v25/learn?case=${inc.learnCaseId}`}>Learn case {inc.learnCaseId}</a> : <a href={`#/v25/learn?incident=${inc.id}`}>Propose a de-identified Learn case from this incident</a>}<a href="#/learn/labs">Learn labs</a></p></section>}
      </div>
      <div className="ops-grid">
        <section className="ops-card" aria-labelledby="facts-h"><h2 id="facts-h">The job</h2>
          <dl className="ops-kv"><dt>Incident</dt><dd>{inc.id}{inc.recurrenceOf ? ` · recurrence of ${inc.recurrenceOf}` : ''}</dd><dt>Room</dt><dd>{inc.roomName}</dd><dt>Opened</dt><dd>{when(inc.openedAt)}</dd>
            <dt>Work order</dt><dd>{wo ? `${wo.id} · ${wo.workType.replace(/_/g, ' ')} · ${wo.state}` : 'not yet — the service manager opens one when assigning'}</dd>
            {intake && <><dt>Reported by</dt><dd>{ENTRY_POINTS[intake.entry]} · {CATEGORIES[intake.category]?.label}{intake.assetId ? ` · ${intake.assetId}` : ''}</dd></>}</dl>
          <p className="ops-note">{inc.summary}</p>
          {intake?.answers.length ? <ul className="ops-list">{intake.answers.map(([q, a]) => <li key={q} className="ops-note">{q} <b>{a}</b></li>)}</ul> : null}
          {intake?.attachments.length ? <p className="ops-meta">Attachments: {intake.attachments.join(', ')}</p> : null}
          {['OPEN', 'REOPENED', 'TRIAGED'].includes(inc.state) && <p className="ops-note">Next: {inc.state === 'TRIAGED' ? 'choosing who may do the work' : 'triage'} on the <a href={`#/service?id=${inc.id}`}>Dispatch board</a>.</p>}
          {wo && holds(persona, 'service.assign') && !['RESOLVED', 'CLOSED', 'CANCELLED', 'VERIFYING'].includes(inc.state) && <button type="button" className="ui-btn ui-btn--quiet" data-testid="cancel-wo" onClick={() => confirm({ key: 'servicehands.cancel', title: `Cancel work order ${wo.id}?`, object: wo.id, actionLabel: 'Cancel the work order', reason: { label: 'Why it is cancelled', min: 8 }, consequence: <>{tech ? `${tech.name} stops the work. ` : ''}The incident becomes CANCELLED; its record and history are kept and the cancellation is in the ledger.</>,
            onConfirm: (reason) => { const prev = ops.snapshot(); if (!cancelWorkOrder(structuredClone(prev), persona, inc.id, reason)) { ops.apply((x) => cancelWorkOrder(x, persona, inc.id, reason)); offerUndo({ label: `${wo.id} was cancelled`, undo: () => ops.restore(prev) }); } else ops.apply((x) => cancelWorkOrder(x, persona, inc.id, reason)); } })}>Cancel the work order…</button>}
        </section>
        {notes.length > 0 && <section className="ops-card" aria-labelledby="nt-h"><h2 id="nt-h">Field notes ({notes.length})</h2><ul className="ops-list">{notes.map((n, i) => <li key={i} className="ops-note"><Tag tone={n.kind === 'blocker' ? (n.cleared ? 'ok' : 'bad') : n.kind === 'escalation' ? 'warn' : 'muted'}>{n.kind}{n.kind === 'blocker' ? (n.cleared ? ' · cleared' : ' · open') : ''}</Tag> {n.text} <span className="ops-meta">{when(n.at)}{n.cleared ? ` · ${n.cleared}` : ''}</span>
          {n.kind === 'blocker' && !n.cleared && (mine || holds(persona, 'service.assign')) && <button type="button" className="ui-btn ui-btn--sm" onClick={() => ops.apply((x) => clearBlocker(x, persona, wo!.id, i, 'cleared on site'))}>Mark cleared</button>}</li>)}</ul></section>}
        {wo && wo.evidence.length > 0 && <section className="ops-card" aria-labelledby="evd-h"><h2 id="evd-h">Evidence ({wo.evidence.length})</h2><ul className="ops-list" data-testid="evidence">{wo.evidence.map((e, i) => <li key={i} className="ops-note"><Tag tone="muted">{e.kind}</Tag> {e.note} <span className="ops-meta">{when(e.at)}</span></li>)}</ul></section>}
        <section className="ops-card" aria-labelledby="rp-h"><h2 id="rp-h">This room before</h2>{prior.length ? <ul className="ops-list">{prior.map((i) => <li key={i.id} className="ops-note">{i.id} · {i.title} <Tag tone={TONE[i.state]}>{i.state}</Tag>{inc.recurrenceOf === i.id ? <b> · this job is its recurrence</b> : ''}</li>)}</ul> : <p className="ops-note">No other service job in this room.</p>}
          <p className="ops-row"><a href={`#/replay/${inc.roomId}`}>Replay the room's history</a><a href={`#/search?focus=Room:${inc.roomId}`}>Search Party</a></p></section>
        <details className="ops-card"><summary>History ({inc.history.length})</summary><ul className="ops-list">{inc.history.map((h, i) => <li key={i} className="ops-note"><Tag tone={TONE[h.to]}>{h.to}</Tag> {when(h.at)} · {w.staff.find((s) => s.id === h.by)?.name || personaLabel(h.by)}</li>)}</ul></details>
      </div>
    </div>
  </>);
}
