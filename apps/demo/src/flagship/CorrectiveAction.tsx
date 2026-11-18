/**
 * One deficiency of the flagship room and the work that corrects it (founder, 17 Nov 2026: "assign the corrective action through
 * Search Party and ServiceHands, retest").
 *
 * Two records on the server move side by side and neither stands in for the other:
 *   the ServiceHands work order   raised on the deficiency, triaged, assigned to someone who passes the hard gates, accepted, preflight,
 *                                 done with field evidence, verified by someone else, closed. Closing a job never passes a test.
 *   the deficiency's own workflow who owns the correction and by when, the root cause and what was done, the retest, its verification.
 *
 * Every button is one request as the person chosen at the top of the page. This component knows what a step needs and nothing about
 * who may take it: the server says, and a refusal is shown in its words. What Search Party answers and who the gates admit are read
 * from the server each time; nobody is ranked here.
 */
import { useState, type ReactNode } from 'react';
import { Tag } from '@empathia/ui';

export interface Issue { code: string; title: string; state: string; workflow: string; workOrders: string[] }
export interface Deficiency { issueId: string; state: string; workflow: string; severity: string; ownerRole: string | null; targetDate: string | null; rootCause: string | null; correctiveAction: string | null; fixedBy: string | null;
  retest: { result: string; evidence: string } | null; closedBy: string | null; rootCauses?: string[] }
interface Cand { id: string; name: string; hardFails: string[]; reasons: string[]; score: number }
/** A credential as the server lists it to whoever is asking: everyone's for those who record or verify them, one's own otherwise. */
export interface Cred { id: string; person: { id: string; name: string }; label: string; state: string; countsForDispatch: boolean; recordedBy: string; decidedBy: string | null }
export interface WorkOrder { code: string; state: string; workType: string | null; severity: string | null; sla: { respond: string; restore: string } | null; assignee: { id: string; name: string } | null; triage: { scope?: string; risk?: string } | null;
  preflight: { ok: boolean; checks: Array<{ id: string; ok: boolean; label?: string; detail?: string }> } | null; evidenceCount: number; evidence: Array<{ kind: string; note: string }>; verification: { outcome: string } | null;
  customerPolicy: { needsCustomerConfirmation: boolean; confirmed: boolean }; need: { certs: string[]; experience: Record<string, string>; tools: string[]; parts: string[] };
  candidates: { eligible: Cand[]; ineligible: Cand[]; none: boolean; whyNone: string | null } | null; workTypes: string[]; severities: string[] }
export interface Qualified { status: string; summary: string; items: Array<{ label: string; via: string; provenance: string }>; uncertainty: string[]; confidence: string }
export interface Answer<T = unknown> { ok: boolean; status: number; body: T; detail: string; reasons: string[] }
export type Said = { ok: boolean; warn?: boolean; title: string; text: string; reasons?: string[] };
export interface Tools { call: <T = unknown>(method: string, path: string, body?: unknown, note?: { text: string; fileName: string }) => Promise<Answer<T>>; act: (label: string, run: () => Promise<Said>) => Promise<void>; refused: (a: Answer, what: string) => Said; person: string; busy: boolean; roles: Array<[string, string]> }

const words = (x: string) => x.replace(/_/g, ' ').toLowerCase();
const WO_ORDER = ['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'RESOLVED', 'CLOSED'];
const DEF_ORDER = ['OPEN', 'IN_PROGRESS', 'PENDING_RETEST', 'CLOSED'];
const past = (order: string[], state: string, step: string) => order.indexOf(state) > order.indexOf(step);
const tomorrow = () => { const from = new Date(Date.now() + 864e5); return { from: from.toISOString(), to: new Date(from.getTime() + 4 * 36e5).toISOString() }; };
const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

function Step({ id, n, title, who, state, children }: { id: string; n: number; title: string; who: string; state: 'done' | 'now' | 'later'; children?: ReactNode }) {
  return <li className="ca__step" data-step={id} data-state={state}><span className="ca__n" aria-hidden="true">{state === 'done' ? '✓' : n}</span>
    <div><b>{title}</b> <span className="ui-muted">· {who}</span>{state === 'done' ? <span className="ui-visually-hidden"> (done)</span> : null}<div className="ca__body">{children}</div></div></li>;
}

export function CorrectiveAction({ issue, def, wo, creds, t }: { issue: Issue; def: Deficiency | null; wo: WorkOrder | null; creds: Cred[]; t: Tools }) {
  const [severity, setSeverity] = useState('High'); const [workType, setWorkType] = useState(''); const [scope, setScope] = useState('Fit absorptive panels to the rear wall, within the AV package (synthetic)'); const [risk, setRisk] = useState('The room is in commissioning; acceptance waits on this (synthetic)');
  const [asked, setAsked] = useState<Qualified | null>(null); const [safety, setSafety] = useState(false); const [tools, setTools] = useState(false); const [access, setAccess] = useState('');
  const [evNote, setEvNote] = useState('Panels fitted to the rear wall; photographs taken (synthetic)'); const [confirmed, setConfirmed] = useState(false);
  const [owner, setOwner] = useState('service'); const [due, setDue] = useState(inDays(10)); const [cause, setCause] = useState('ACOUSTICS'); const [action, setAction] = useState('Absorptive panels fitted to the rear wall, as the acoustic brief allows (synthetic)');
  const W = wo ? `/v1/work-orders/${wo.code}` : ''; const D = `/v1/issues/${issue.code}/deficiency`; const ws = wo?.state || 'NONE'; const dw = def?.workflow || issue.workflow;
  const go = (label: string, what: string, run: () => Promise<Answer>, ok: Said) => t.act(label, async () => { const a = await run(); return a.ok ? ok : t.refused(a, what); });
  const post = (path: string, body: unknown = {}) => () => t.call('POST', path, body);
  // who the gates admit and refuse right now, as the server lists them: an answer from Search Party is shown only while this is what it was
  // when the answer was given. A credential verified since, or anything else that moves a gate, makes the answer an old one.
  const gates = wo?.candidates ? `${wo.candidates.eligible.map((x) => x.id).join(',')}|${wo.candidates.ineligible.map((x) => x.id).join(',')}` : '';
  const [askedAt, setAskedAt] = useState('');
  const ask = () => t.act('Asking Search Party who is qualified…', async () => { const a = await t.call<Qualified>('POST', '/v1/search/intent', { question: 'who is qualified to fix this', target: { type: 'RoomIssue', id: issue.code } });
    if (!a.ok) { setAsked(null); return t.refused(a, 'the question'); } setAsked(a.body); setAskedAt(gates); return { ok: true, title: 'Search Party answered.', text: a.body.summary }; });
  const btn = (id: string, label: string, onClick: () => void, primary = true, disabled = false) => <button type="button" className={`ui-btn ui-btn--sm${primary ? ' ui-btn--primary' : ''}`} data-testid={id} disabled={t.busy || disabled} onClick={onClick}>{label}</button>;

  return (
    <div className="ca" data-testid="fl-corrective" data-issue={issue.code} data-wo={wo?.code || ''} data-wo-state={ws} data-workflow={dw}>
      <div className="ca__col">
        <h4 className="fl__h4">ServiceHands work order {wo ? <span className="ui-mono">{wo.code}</span> : null} {wo ? <Tag tone={ws === 'CLOSED' || ws === 'RESOLVED' ? 'ok' : 'warn'}>{words(ws)}</Tag> : null}</h4>
        <ol className="ca__steps">
          <Step id="raise" n={1} title="Raise a work order on the deficiency" who="service manager" state={wo ? 'done' : 'now'}>
            {wo ? <span>{wo.code} is on {issue.code}.</span> : <p className="build__row">{btn('fl-wo-raise', `Raise it as the ${t.person}`, () => void go('Raising the work order…', 'the work order', post(`/v1/issues/${issue.code}/work-orders`, { note: 'handed over from commissioning (synthetic)' }), { ok: true, title: 'The work order is raised.', text: 'It is open on the deficiency and waits to be triaged.' }))}</p>}
          </Step>
          <Step id="triage" n={2} title="Triage: severity, scope and risk" who="service manager" state={!wo ? 'later' : ws === 'OPEN' ? 'now' : 'done'}>
            {wo && ws === 'OPEN' ? <>
              <div className="ca__row"><label className="kit-field">Severity <select value={severity} data-testid="fl-wo-severity" onChange={(e: { target: { value: string } }) => setSeverity(e.target.value)}>{wo.severities.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
                <label className="kit-field">Kind of work <select value={workType} data-testid="fl-wo-type" onChange={(e: { target: { value: string } }) => setWorkType(e.target.value)}><option value="">Not named (the server treats it as break fix)</option>{wo.workTypes.map((s) => <option key={s} value={s}>{words(s)}</option>)}</select></label></div>
              <label className="kit-field">Scope <input type="text" value={scope} maxLength={500} data-testid="fl-wo-scope" onChange={(e: { target: { value: string } }) => setScope(e.target.value)} /></label>
              <label className="kit-field">Risk <input type="text" value={risk} maxLength={500} data-testid="fl-wo-risk" onChange={(e: { target: { value: string } }) => setRisk(e.target.value)} /></label>
              <p className="build__row">{btn('fl-wo-triage', `Triage as the ${t.person}`, () => void go('Triaging…', 'the triage', post(`${W}/triage`, { severity, scope, risk, ...(workType ? { workType } : {}), window: tomorrow() }), { ok: true, title: 'Triaged.', text: 'The severity sets the service level. The kind of work sets what a person must hold to be assigned.' }), true, !scope.trim() || !risk.trim())}</p>
              <p className="ui-meta">The kind of work decides the hard gates: certifications, experience, tools. The work window is tomorrow, four hours.</p>
            </> : wo && wo.severity ? <span>{wo.severity}{wo.sla ? `: respond ${wo.sla.respond}, restore ${wo.sla.restore}` : ''} · {wo.workType ? words(wo.workType) : 'general field work'} · “{wo.triage?.scope}”</span> : null}
          </Step>
          <Step id="assign" n={3} title="Find who is qualified, and assign" who="service manager, through Search Party" state={!wo || ws === 'OPEN' ? 'later' : ws === 'TRIAGED' ? 'now' : 'done'}>
            {wo && ws === 'TRIAGED' ? <>
              <p className="ui-meta" data-testid="fl-wo-need">This job needs: {wo.need.certs.join(', ') || 'no certification'} · experience {Object.entries(wo.need.experience).map(([k, v]) => `${k} ${v}`).join(', ') || 'none named'} · tools {wo.need.tools.join(', ') || 'none named'}.</p>
              <p className="build__row">{btn('fl-sp-ask', `Ask Search Party who is qualified, as the ${t.person}`, () => void ask(), false)}</p>
              {asked && askedAt !== gates && wo.candidates ? <p className="ui-meta" data-testid="fl-sp-stale">Search Party answered before the gates last changed (a credential was verified, or someone’s capacity moved). Its answer is not shown: ask again.</p> : null}
              {asked && (askedAt === gates || !wo.candidates) ? <div className="ca__answer" data-testid="fl-sp-answer" data-status={asked.status}><b>{asked.summary}</b>
                <ul className="fl__list">{asked.items.map((i) => <li key={i.label}>{i.label}: {i.via}</li>)}</ul>
                <p className="ui-meta">{asked.items[0]?.provenance ? `From: ${asked.items[0].provenance}. ` : ''}{asked.uncertainty.length ? `Not known: ${asked.uncertainty.join('; ')}.` : ''}</p></div> : null}
              {wo.candidates ? <ul className="fl__list ca__cands" data-testid="fl-candidates">
                {wo.candidates.eligible.map((c) => <li key={c.id} data-person={c.id} data-eligible="yes"><span><b>{c.name}</b> <Tag tone="ok">passes every gate</Tag> <span className="ui-muted">{c.reasons.join(' · ')}</span></span>{btn('fl-assign', `Assign as the ${t.person}`, () => void go('Assigning…', 'the assignment', post(`${W}/assign`, { personId: c.id }), { ok: true, title: `Assigned to ${c.name}.`, text: 'The technician accepts the job before any work starts.' }))}</li>)}
                {wo.candidates.ineligible.map((c) => <li key={c.id} data-person={c.id} data-eligible="no"><span><b>{c.name}</b> <Tag tone="bad">fails a gate</Tag> <span className="ui-muted">{c.hardFails.join(' · ')}</span></span>{btn('fl-assign-anyway', 'Assign anyway', () => void go('Assigning…', 'the assignment', post(`${W}/assign`, { personId: c.id }), { ok: true, title: `Assigned to ${c.name}.`, text: '' }), false)}</li>)}
                {wo.candidates.none ? <li data-eligible="none">Nobody in the service pool passes every gate{wo.candidates.whyNone ? `: ${wo.candidates.whyNone}` : ''}. The job cannot be assigned until someone does.</li> : null}
              </ul> : <p className="ui-meta" data-testid="fl-candidates-hidden">The server shows who the gates admit only to someone who may assign. As the {t.person} you see none.</p>}
            </> : wo?.assignee ? <span data-testid="fl-wo-assignee">Assigned to {wo.assignee.name}.</span> : null}
          </Step>
          <Step id="work" n={4} title="Accept, preflight, do the work, hand over" who="the assigned technician" state={!wo || past(WO_ORDER, 'ASSIGNED', ws) ? 'later' : ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(ws) ? 'now' : 'done'}>
            {wo?.assignee && ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(ws) ? <p className="ui-meta" data-testid="fl-wo-only">The job is {wo.assignee.name}’s. The server refuses each of these steps to anyone else, another technician included.</p> : null}
            {wo && ws === 'ASSIGNED' ? <p className="build__row">{btn('fl-wo-accept', `Accept the job as the ${t.person}`, () => void go('Accepting…', 'the acceptance', post(`${W}/accept`), { ok: true, title: 'The job is accepted.', text: 'Next is the preflight: the server does not let work start on a failed one.' }))}</p> : null}
            {wo && ws === 'ACCEPTED' ? <>
              <div className="ca__checks"><label><input type="checkbox" checked={safety} data-testid="fl-pf-safety" onChange={(e: { target: { checked: boolean } }) => setSafety(e.target.checked)} /> Safety brief given</label>
                <label><input type="checkbox" checked={tools} data-testid="fl-pf-tools" onChange={(e: { target: { checked: boolean } }) => setTools(e.target.checked)} /> Tools on hand: {wo.need.tools.join(', ') || 'none named'}</label></div>
              <label className="kit-field">Site access confirmed by <input type="text" value={access} maxLength={120} data-testid="fl-pf-access" placeholder="who confirmed it" onChange={(e: { target: { value: string } }) => setAccess(e.target.value)} /></label>
              <p className="build__row">{btn('fl-wo-preflight', `Record the preflight as the ${t.person}`, () => void t.act('Recording the preflight…', async () => { const a = await t.call<{ ok: boolean; checks: Array<{ id: string; ok: boolean }> }>('POST', `${W}/preflight`, { safetyBriefed: safety, toolsConfirmed: tools ? wo.need.tools : [], ...(access.trim() ? { accessConfirmedBy: access.trim() } : {}),
                  stock: Object.fromEntries(wo.need.parts.map((p) => [p, { onHand: 1, checkedAt: new Date().toISOString() }])) }); if (!a.ok) return t.refused(a, 'the preflight');
                return a.body.ok ? { ok: true, title: 'The preflight passed.', text: 'The work can start.' } : { ok: true, warn: true, title: 'The preflight is recorded, and it failed.', text: `Not met: ${a.body.checks.filter((k) => !k.ok).map((k) => words(k.id)).join(', ')}. The server will not let the work start until a preflight passes.` }; }), false)}
                {btn('fl-wo-start', `Start the work as the ${t.person}`, () => void go('Starting…', 'the start of work', post(`${W}/start`), { ok: true, title: 'The work has started.', text: 'Field evidence is recorded while it is in progress.' }))}</p>
              {wo.preflight ? <p className="ui-meta" data-testid="fl-pf-state" data-ok={wo.preflight.ok ? 'yes' : 'no'}>Last preflight: {wo.preflight.ok ? 'passed' : `failed (${wo.preflight.checks.filter((k) => !k.ok).map((k) => words(k.id)).join(', ')})`}.</p> : <p className="ui-meta" data-testid="fl-pf-state" data-ok="none">No preflight recorded yet.</p>}
            </> : null}
            {wo && ws === 'IN_PROGRESS' ? <>
              <label className="kit-field">What was done (field evidence) <input type="text" value={evNote} maxLength={500} data-testid="fl-wo-evnote" onChange={(e: { target: { value: string } }) => setEvNote(e.target.value)} /></label>
              <p className="build__row">{btn('fl-wo-evidence', `Record it as the ${t.person}`, () => void go('Recording the field evidence…', 'the field evidence', post(`${W}/evidence`, { kind: 'photo', note: evNote, ref: `EV-SYN-${wo.code}-${wo.evidenceCount + 1}` }), { ok: true, title: 'Field evidence recorded.', text: 'Its recorder cannot verify the job.' }), false, !evNote.trim())}
                {btn('fl-wo-submit', `Hand over for verification as the ${t.person}`, () => void go('Handing over…', 'the hand-over', post(`${W}/submit`), { ok: true, title: 'Handed over for verification.', text: 'Someone who did not do the work verifies it.' }))}</p>
              <p className="ui-meta" data-testid="fl-wo-evcount" data-count={wo.evidenceCount}>{wo.evidenceCount} piece{wo.evidenceCount === 1 ? '' : 's'} of field evidence on the job.</p>
            </> : null}
            {wo && past(WO_ORDER, ws, 'IN_PROGRESS') ? <span>Done by {wo.assignee?.name}, with {wo.evidenceCount} piece{wo.evidenceCount === 1 ? '' : 's'} of field evidence.</span> : null}
          </Step>
          <Step id="verify" n={5} title="Verify the work, then close the job" who="someone who did not do it; then the service manager" state={!wo || past(WO_ORDER, 'VERIFYING', ws) ? 'later' : ws === 'CLOSED' ? 'done' : 'now'}>
            {wo && ws === 'VERIFYING' ? <p className="build__row">{btn('fl-wo-verify', `Verify the work as the ${t.person}`, () => void go('Verifying…', 'the verification', post(`${W}/verify`, { outcome: 'pass', note: 'checked in the room (synthetic)' }), { ok: true, title: 'The work is verified.', text: 'The job is resolved. The deficiency is not: only its retest closes it.' }))}</p> : null}
            {wo && ws === 'RESOLVED' ? <>{wo.customerPolicy.needsCustomerConfirmation ? <div className="ca__checks"><label><input type="checkbox" checked={confirmed} data-testid="fl-wo-confirmed" onChange={(e: { target: { checked: boolean } }) => setConfirmed(e.target.checked)} /> The requester confirmed the work (needed at this severity)</label></div> : null}
              <p className="build__row">{btn('fl-wo-close', `Close the job as the ${t.person}`, () => void go('Closing…', 'the closing', post(`${W}/close`, { note: 'closed after verification (synthetic)', customerConfirmed: confirmed }), { ok: true, title: 'The job is closed.', text: 'Closing a job never passes a test: the deficiency stays open until its retest is verified.' }))}</p></> : null}
            {wo && ws === 'CLOSED' ? <span>Verified and closed.</span> : null}
          </Step>
        </ol>
        {wo && creds.length ? <div className="ca__creds" data-testid="fl-creds" data-pending={creds.filter((k) => k.state === 'PENDING_VERIFICATION').length}>
          <h5 className="fl__h4">Credentials the gates read</h5>
          <ul className="fl__list">{creds.map((k) => <li key={k.id} data-cred={k.id} data-state={k.state} data-person={k.person.id}><span><b>{k.person.name}</b>: {k.label} <Tag tone={k.countsForDispatch ? 'ok' : 'warn'}>{k.countsForDispatch ? 'verified: counts' : k.state === 'PENDING_VERIFICATION' ? 'recorded, not verified: counts for nothing' : words(k.state)}</Tag> <span className="ui-muted">recorded by {k.recordedBy}{k.decidedBy ? `, decided by ${k.decidedBy}` : ''}</span></span>
            {k.state === 'PENDING_VERIFICATION' ? btn('fl-cred-verify', `Verify it as the ${t.person}`, () => void go('Asking the server to verify the credential…', 'the verification of the credential', post(`/v1/competencies/${k.id}/verify`, { note: 'checked against the issuer record (synthetic)' }), { ok: true, title: 'The credential is verified.', text: 'It counts in the gates from now. Whoever may assign sees the candidates again with it.' }), false) : null}</li>)}</ul>
          <p className="ui-meta">As the {t.person} you are shown {creds.length === 1 ? 'this one' : `these ${creds.length}`}: credentials are personal records, and only those who record or verify them see everyone’s. A credential counts once someone who neither recorded it nor holds it has verified it.</p>
        </div> : null}
      </div>
      <div className="ca__col">
        <h4 className="fl__h4">The deficiency’s own record <Tag tone={dw === 'CLOSED' ? 'ok' : 'warn'}>{words(dw)}</Tag></h4>
        <ol className="ca__steps">
          <Step id="def-start" n={1} title="Name the owner and a date" who="commissioning engineer" state={dw === 'OPEN' ? 'now' : 'done'}>
            {dw === 'OPEN' ? <><div className="ca__row"><label className="kit-field">Owner <select value={owner} data-testid="fl-def-owner" onChange={(e: { target: { value: string } }) => setOwner(e.target.value)}>{t.roles.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
              <label className="kit-field">Target date <input type="date" value={due} data-testid="fl-def-due" onChange={(e: { target: { value: string } }) => setDue(e.target.value)} /></label></div>
              <p className="build__row">{btn('fl-def-start', `Start the correction as the ${t.person}`, () => void go('Recording the owner…', 'the start of the correction', post(D, { step: 'start', ownerRole: owner, targetDate: due }), { ok: true, title: 'The correction has an owner and a date.', text: '' }))}</p></>
              : <span>{def?.ownerRole ? `Owned by the ${words(def.ownerRole)}` : 'Owner recorded'}{def?.targetDate ? `, due ${def.targetDate}` : ''}.</span>}
          </Step>
          <Step id="def-fixed" n={2} title="Record the root cause and what was done" who="whoever did the work" state={past(DEF_ORDER, 'IN_PROGRESS', dw) ? 'later' : dw === 'IN_PROGRESS' ? 'now' : 'done'}>
            {dw === 'IN_PROGRESS' ? <><label className="kit-field">Root cause <select value={cause} data-testid="fl-def-cause" onChange={(e: { target: { value: string } }) => setCause(e.target.value)}>{(def?.rootCauses || [cause]).map((x) => <option key={x} value={x}>{words(x)}</option>)}</select></label>
              <label className="kit-field">What was done <input type="text" value={action} maxLength={500} data-testid="fl-def-action" onChange={(e: { target: { value: string } }) => setAction(e.target.value)} /></label>
              <p className="build__row">{btn('fl-def-fixed', `Record the correction as the ${t.person}`, () => void go('Recording the correction…', 'the correction', post(D, { step: 'fixed', rootCause: cause, action }), { ok: true, title: 'The correction is recorded.', text: 'It waits for a retest: for a measured test, that is a new measurement at the bench.' }), true, !action.trim())}</p></>
              : dw !== 'OPEN' && def?.rootCause ? <span>{words(def.rootCause)}: {def.correctiveAction}</span> : null}
          </Step>
          <Step id="def-retest" n={3} title="Retest" who="commissioning engineer, at the bench" state={past(DEF_ORDER, 'PENDING_RETEST', dw) ? 'later' : dw === 'PENDING_RETEST' && !def?.retest ? 'now' : 'done'}>
            {dw === 'PENDING_RETEST' && !def?.retest ? <><p className="ui-meta">For a test with a criterion the retest is the test’s own new result: measure again at the bench above, record PASS on the new measurement, then record the retest here. The server refuses a retest that rests on anything older than the correction.</p>
              <p className="build__row">{btn('fl-def-retest', `Record the retest as the ${t.person}`, () => void go('Recording the retest…', 'the retest', post(D, { step: 'retest', result: 'PASS', evidence: 'the new measurement' }), { ok: true, title: 'The retest is recorded.', text: 'It names the measurement it rests on. Someone who neither fixed nor retested verifies it.' }))}</p></>
              : def?.retest ? <span data-testid="fl-def-retest-evidence">{def.retest.result} on {def.retest.evidence}.</span> : null}
          </Step>
          <Step id="def-verify" n={4} title="Verify the retest" who="someone who neither fixed nor retested" state={dw === 'CLOSED' ? 'done' : def?.retest ? 'now' : 'later'}>
            {dw !== 'CLOSED' && def?.retest ? <p className="build__row">{btn('fl-def-verify', `Verify as the ${t.person}`, () => void go('Verifying the retest…', 'the verification of the retest', post(D, { step: 'verify' }), { ok: true, title: 'The deficiency is closed.', text: 'By its verified retest, and by nothing else.' }))}</p> : dw === 'CLOSED' ? <span>Closed by its verified retest.</span> : null}
          </Step>
        </ol>
      </div>
    </div>
  );
}
