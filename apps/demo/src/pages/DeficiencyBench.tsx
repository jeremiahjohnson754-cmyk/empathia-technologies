/**
 * The deficiency workbench on #/commissioning/deficiencies: pick a deficiency, see where it is in the state machine (Open, In progress,
 * Pending retest, Closed, Accepted exception, Deferred), its age, target, root cause, action, retest and history, and take the steps
 * the acting perspective may take. Every refusal is the engine's, with its reason; every step taken is written to the audit trail.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Card, Notice, Tag } from '@empathia/ui';
import { step, stepsFrom, due, blocksAcceptance, ROOT_CAUSES, DEFICIENCY_STATES, type Deficiency, type DeficiencyAction, type RootCause } from '@empathia/commissioning-engine';
import { deficiencyOf, save, mayStep, STEP_LABEL, STEP_AUTHORITY } from '../assurance/deficiencyStore.js';
import type { RoomRecord, Issue } from '../campus/design.js';
import { DEMO_NOW } from '../campus/design.js';
import { shortName } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { handDeficiencyToService, incidentForDeficiency, HANDOFF_AUTHORITIES } from '../workspace/store.js';
import { holds } from '../build/store.js';
import { personaLabel } from '../build/store.js';

const WORD: Record<string, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', PENDING_RETEST: 'Pending retest', CLOSED: 'Closed', ACCEPTED_EXCEPTION: 'Accepted exception', DEFERRED: 'Deferred' };
const today = () => Math.max(Date.now(), DEMO_NOW);
const plusDays = (n: number) => new Date(today() + n * 864e5).toISOString().slice(0, 10);

export function DeficiencyBench({ items, persona, initial = '' }: { items: Array<{ r: RoomRecord; i: Issue; found: string }>; persona: string; initial?: string }) {
  const { w, apply } = useWorkspace();
  const [sel, setSel] = useState(initial && items.some((x) => `${x.r.outline.id}:${x.i.id}` === initial) ? initial : items[0] ? `${items[0].r.outline.id}:${items[0].i.id}` : ''); const [tick, setTick] = useState(0);
  const [why, setWhy] = useState<string[] | null>(null); const [done, setDone] = useState<string | null>(null);
  const [owner, setOwner] = useState('installer'); const [target, setTarget] = useState(plusDays(10)); const [cause, setCause] = useState<RootCause>('CONFIGURATION');
  const [action, setAction] = useState(''); const [evidence, setEvidence] = useState(''); const [exc, setExc] = useState(''); const [reason, setReason] = useState(''); const [until, setUntil] = useState(plusDays(30));
  const it = items.find((x) => `${x.r.outline.id}:${x.i.id}` === sel) || items[0];
  const d = useMemo(() => (it ? deficiencyOf(it.r, it.i, it.found) : null), [it, tick]);
  if (!it || !d) return null;
  const now = new Date(today()).toISOString(); const dd = due(d, now);
  const take = (a: DeficiencyAction) => {
    setWhy(null); setDone(null);
    const r: ReturnType<typeof step> = mayStep(persona, a.kind) ? step(d, a, persona, now) : { ok: false, why: [`${personaLabel(persona)} does not hold ${STEP_AUTHORITY[a.kind].join(' or ')}`] };
    apply((x) => { x.events.unshift({ at: now, by: persona, type: `deficiency.${a.kind}`, aggregate: d.id, detail: r.ok ? `${d.title}: ${WORD[d.state]} → ${WORD[r.next.state]} · ${r.next.history[r.next.history.length - 1]!.note}` : `refused: ${r.why.join('; ')}`, outcome: r.ok ? 'ALLOWED' : 'DENIED' }); return null; });
    if (!r.ok) { setWhy(r.why); return; }
    const e = save(r.next); if (e) { setWhy([e]); return; } setDone(`${WORD[d.state]} → ${WORD[r.next.state]}`); setTick((t) => t + 1);
  };
  const can = stepsFrom(d.state);
  const btn = (k: DeficiencyAction['kind'], a: () => DeficiencyAction, extra?: ReactNode) => can.includes(k) ? <div className="df-step" data-testid="df-step" data-step={k} data-allowed={mayStep(persona, k)}>
    <b>{STEP_LABEL[k]}</b>{extra}<button type="button" className="ui-btn" onClick={() => take(a())} data-testid={`df-do-${k}`}>{STEP_LABEL[k].split(':')[0]}</button>
    {!mayStep(persona, k) ? <span className="ui-meta">needs {STEP_AUTHORITY[k].join(' or ')}</span> : null}</div> : null;
  return (
    <Card icon="wrench" tone="commissioning" title="Work a deficiency" sub="The engine’s state machine: each step checks who acts and what it rests on, and says why when it refuses" testId="df-bench">
      <label className="rv-field"><span>Deficiency</span><select value={sel} onChange={(e) => { setSel(e.target.value); setWhy(null); setDone(null); }} data-testid="df-select">
        {items.map((x) => <option key={`${x.r.outline.id}:${x.i.id}`} value={`${x.r.outline.id}:${x.i.id}`}>{x.i.severity} · {x.i.title} · {shortName(x.r.outline)}</option>)}</select></label>
      <ol className="df-states" aria-label="States" data-testid="df-states" data-state={d.state}>{DEFICIENCY_STATES.map((s) => <li key={s} className={s === d.state ? 'on' : ''} aria-current={s === d.state ? 'step' : undefined}>{WORD[s]}</li>)}</ol>
      <dl className="san__defs df-facts" data-testid="df-facts">
        <div><dt>Age</dt><dd>{dd.ageDays} days{dd.late ? <> · <Tag tone="bad">past target</Tag></> : null}</dd></div><div><dt>Owner · target</dt><dd>{d.owner ? `${personaLabel(d.owner)} · ${d.targetDate}` : '—'}</dd></div>
        <div><dt>Root cause · action</dt><dd>{d.rootCause ? `${d.rootCause.toLowerCase().replace(/_/g, ' ')} · ${d.action}` : '—'}</dd></div><div><dt>Retest</dt><dd>{d.retest ? `${d.retest.result} on ${d.retest.evidence} by ${personaLabel(d.retest.by)}` : '—'}</dd></div>
        <div><dt>Open to exception</dt><dd>{d.waivable ? 'yes, with an approved exception record' : 'no: it is against safety, security, evidence or separation of duties'}</dd></div><div><dt>Blocks acceptance</dt><dd>{blocksAcceptance(d) ? 'yes' : 'no'}</dd></div>
      </dl>
      {(() => { const inc = incidentForDeficiency(w, d.id); const may = HANDOFF_AUTHORITIES.some((x) => holds(persona, x));
        return <div className="df-step" data-testid="df-service" data-incident={inc?.id || ''}>
          <b>ServiceHands</b>
          {inc ? <span>Handed to service as <a href={`#/v25/service?id=${inc.id}`} data-testid="df-service-link">{inc.id}</a> <Tag tone={inc.state === 'RESOLVED' || inc.state === 'CLOSED' ? 'ok' : 'info'}>{inc.state}</Tag>. Closing the job does not close this deficiency: the retest, verified by someone else, does.</span>
            : <><span className="ui-muted">A field deficiency can be handed to service as a work order; a design deficiency gets a design change.</span>
              <button type="button" className="ui-btn" data-testid="df-handoff" onClick={() => { setWhy(null); setDone(null); const res = apply((x) => handDeficiencyToService(x, persona, { deficiencyId: d.id, issueId: it.i.id, state: d.state, title: it.i.title, severity: it.i.severity, roomId: it.r.outline.id, roomName: it.r.outline.name, buildingKey: it.r.outline.building, lifecycle: it.r.lifecycle })); if ('why' in res) setWhy(res.why); else setDone(`Handed to ServiceHands as ${res.id}`); }}>Hand to ServiceHands</button>
              {!may ? <span className="ui-meta">needs {HANDOFF_AUTHORITIES.join(' or ')}</span> : null}</>}
          {' '}<a href={`#/thread?room=${it.r.outline.id}`} data-testid="df-thread-link">The room’s whole thread</a>
        </div>; })()}
      {why ? <div role="alert" data-testid="df-refused"><Notice tone="bad"><b>Refused.</b> {why.join(' · ')}</Notice></div> : null}
      {done ? <div role="status" data-testid="df-done"><Notice tone="ok">{done}. Written to the audit trail.</Notice></div> : null}
      <div className="df-steps">
        {btn('start', () => ({ kind: 'start', owner, targetDate: target }), <><label className="rv-field"><span>Owner</span><select value={owner} onChange={(e) => setOwner(e.target.value)} data-testid="df-owner">{['installer', 'service', 'syseng', 'opslead'].map((p) => <option key={p} value={p}>{personaLabel(p)}</option>)}</select></label><label className="rv-field"><span>Target date</span><input type="date" value={target} onChange={(e) => setTarget(e.target.value)} data-testid="df-target" /></label></>)}
        {btn('fixed', () => ({ kind: 'fixed', rootCause: cause, action }), <><label className="rv-field"><span>Root cause</span><select value={cause} onChange={(e) => setCause(e.target.value as RootCause)} data-testid="df-cause">{ROOT_CAUSES.map((c) => <option key={c} value={c}>{c.toLowerCase().replace(/_/g, ' ')}</option>)}</select></label><label className="rv-field"><span>What was done</span><input value={action} onChange={(e) => setAction(e.target.value)} data-testid="df-action" placeholder="e.g. AEC reference re-routed to the far-end output" /></label></>)}
        {btn('retest', () => ({ kind: 'retest', result: 'PASS', evidence }), <label className="rv-field"><span>Evidence reference</span><input value={evidence} onChange={(e) => setEvidence(e.target.value)} data-testid="df-evidence" placeholder="EV-…" /></label>)}
        {can.includes('retest') ? <button type="button" className="ui-btn ui-btn--quiet" onClick={() => take({ kind: 'retest', result: 'FAIL', evidence })} data-testid="df-do-retest-fail">Record a failed retest</button> : null}
        {btn('verify', () => ({ kind: 'verify' }))}
        {btn('except', () => ({ kind: 'except', exceptionId: exc, requestedBy: d.owner || 'cxeng' }), <label className="rv-field"><span>Approved exception record</span><input value={exc} onChange={(e) => setExc(e.target.value)} data-testid="df-exc" placeholder="EX-…" /></label>)}
        {btn('defer', () => ({ kind: 'defer', reason, until, acceptanceDue: ['COMMISSIONING', 'COMMISSIONED'].includes(it.r.lifecycle) }), <><label className="rv-field"><span>Reason</span><input value={reason} onChange={(e) => setReason(e.target.value)} data-testid="df-reason" /></label><label className="rv-field"><span>Until</span><input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></label></>)}
        {btn('resume', () => ({ kind: 'resume', reason: reason || 'resumed by hand' }))}
        {btn('reopen', () => ({ kind: 'reopen', reason }), <label className="rv-field"><span>What regressed</span><input value={reason} onChange={(e) => setReason(e.target.value)} data-testid="df-reopen-reason" /></label>)}
        {!can.length ? <p className="ui-muted">An accepted exception is final for this deficiency; a new finding opens a new one.</p> : null}
      </div>
      <details className="ln-dom" data-testid="df-history" open><summary><b>History</b> ({d.history.length})</summary>
        <ol className="plain">{d.history.map((h, k) => <li key={k} className="ui-meta"><span className="ui-mono">{h.at.slice(0, 16).replace('T', ' ')}</span> · {personaLabel(h.by)} · {WORD[h.from]} → {WORD[h.to]} · {h.note}</li>)}</ol></details>
    </Card>
  );
}
