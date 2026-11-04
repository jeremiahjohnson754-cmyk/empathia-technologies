/**
 * Decisions: the Decision desk (#/v25/decisions) and Decision Memory (#/decisions). Every decision is bound to a scope revision and a
 * pitch version; a hold needs a reason and a review date; a rejection needs a reason and a named confirmation; funding is a separate
 * finance signature; field work needs both. Decision Memory keeps who decided what, the options weighed, why, and what happened after.
 */
import { useRef, useState } from 'react';
import { Tag } from '@empathia/ui';
import type { WorkspaceProps } from '../hardening/lazy.js';
import { OpsHead, NotYours, holds, personaLabel, personaOf, when } from '../hardening/kit.js';
import { opsPath } from '../hardening/path.js';
import { useConfirm, useUndo } from '../safeguards/Safeguards.js';
import { load, save, seed, decide, fund, record, withdraw, mayWithdraw, fieldReady, funded, decidable, MEMORY_AUTHORITIES, type DecisionState, type Refusal, type Project } from './store.js';

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { DECISION_PENDING: 'warn', APPROVED: 'ok', FUNDED: 'ok', HELD: 'warn', REJECTED: 'bad' };
const money = (n: number) => `$${n.toLocaleString('en-US')}`;

function useDecisions() {
  const [d, setD] = useState<DecisionState>(load); const cur = useRef(d); const [refusal, setRefusal] = useState<Refusal | null>(null);
  const apply = <T,>(fn: (x: DecisionState) => T): T => { const n = structuredClone(cur.current); const r = fn(n); setRefusal(r && typeof r === 'object' && 'why' in (r as object) ? (r as unknown as Refusal) : null); cur.current = n; save(n); setD(n); return r; };
  const restore = (s: DecisionState) => { cur.current = structuredClone(s); save(cur.current); setD(cur.current); setRefusal(null); };
  return { d, apply, refusal, restore, snapshot: () => structuredClone(cur.current) };
}

export default function Decisions({ perspective, hash }: WorkspaceProps) {
  const persona = personaOf(perspective); const desk = opsPath(hash)[0] === 'v25';
  const D = useDecisions(); const confirm = useConfirm(); const undo = useUndo();
  return (
    <section className="ops" data-testid="decisions">
      <OpsHead product="pro" kicker={desk ? 'Pro · governance' : 'Pro · Decision Memory'} title={desk ? 'Decision desk' : 'Decision Memory'} persona={persona}
        lead={desk ? <>Approve, hold or reject against a scope revision; fund separately; nothing moves to the field without both.</> : <>Why things are the way they are: who decided, what else was considered, why, and what happened after.</>}
        actions={<button type="button" className="ui-btn ui-btn--quiet" data-testid="reset-decisions" onClick={() => confirm.ask({ key: 'decisions.reset', title: 'Reset the decisions?', object: 'reset decisions', actionLabel: 'Reset the decisions', consequence: <>Every project state, decision, funding signature and Decision Memory record in <b>this browser</b> returns to the seed.</>, onConfirm: () => { const prev = D.snapshot(); D.restore(seed()); undo.offer({ label: 'the decisions were returned to the seed', undo: () => D.restore(prev) }); } })}>Reset decisions</button>} />
      <nav className="ops-tabs" aria-label="Decisions"><a href="#/v25/decisions" aria-current={desk ? 'page' : undefined}>Decision desk</a><a href="#/decisions" aria-current={desk ? undefined : 'page'}>Decision Memory</a></nav>
      {undo.bar}
      {D.refusal && <div role="alert" className="ops-refused" data-testid="refusal"><b>Refused.</b><ul>{D.refusal.why.map((x) => <li key={x}>{x}</li>)}</ul></div>}
      {desk ? <Desk D={D} persona={persona} confirm={confirm.ask} /> : <MemoryView D={D} persona={persona} confirm={confirm.ask} offerUndo={undo.offer} />}
      {confirm.dialog}
    </section>
  );
}

function Desk({ D, persona, confirm }: { D: ReturnType<typeof useDecisions>; persona: string; confirm: ReturnType<typeof useConfirm>['ask'] }) {
  const { d } = D; const pending = d.projects.filter(decidable); const toFund = d.projects.filter((p) => p.state === 'APPROVED'); const rest = d.projects.filter((p) => !decidable(p) && p.state !== 'APPROVED');
  return (<>
    <section className="ops-card" aria-labelledby="pend-h" data-testid="pending"><h2 id="pend-h">{persona === 'exec' ? 'Awaiting your decision' : 'Awaiting an executive decision'} · {pending.length}</h2>
      {pending.length ? <ul className="ops-list">{pending.map((p) => <PendingRow key={p.id} p={p} D={D} persona={persona} confirm={confirm} />)}</ul> : <p className="ops-note">No decision is pending.</p>}</section>
    <section className="ops-card" aria-labelledby="fund-h" data-testid="to-fund"><h2 id="fund-h">Approved · awaiting funding · {toFund.length}</h2>
      {toFund.length ? <ul className="ops-list">{toFund.map((p) => <FundRow key={p.id} p={p} D={D} persona={persona} />)}</ul> : <p className="ops-note">Nothing waits for money.</p>}</section>
    <section className="ops-card" aria-labelledby="all-h"><h2 id="all-h">Field readiness</h2>
      <div className="ops-table-wrap"><table className="ops-table" data-testid="readiness"><caption className="ui-sr">Every project, whether it may go to the field, and why</caption><thead><tr><th scope="col">Project</th><th scope="col">State</th><th scope="col">Scope / pitch</th><th scope="col">Field work</th></tr></thead>
        <tbody>{[...pending, ...toFund, ...rest].map((p) => { const r = fieldReady(d, p); return <tr key={p.id}><th scope="row">{p.name}<div className="ops-meta">{p.id}</div></th><td><Tag tone={TONE[p.state] || 'muted'}>{p.state.replace('_', ' ')}</Tag></td><td>rev {p.scopeRev} · v{p.pitchRev}</td><td className={r.ok ? 'ops-ok' : 'ops-fail'}>{r.why}</td></tr>; })}</tbody></table></div></section>
    <section className="ops-card" aria-labelledby="dec-h"><h2 id="dec-h">Decisions · {d.decisions.length}</h2>
      <div className="ops-table-wrap"><table className="ops-table" data-testid="decision-log"><caption className="ui-sr">Decisions, newest first</caption><thead><tr><th scope="col">Decision</th><th scope="col">Project</th><th scope="col">By</th><th scope="col">Scope / pitch</th><th scope="col">Reason</th><th scope="col">When</th></tr></thead>
        <tbody>{d.decisions.map((x) => <tr key={x.id}><td><Tag tone={TONE[x.decision]}>{x.decision}</Tag></td><td>{d.projects.find((p) => p.id === x.projectId)?.name}</td><td>{personaLabel(x.by)}</td><td>rev {x.scopeRev} · v{x.pitchRev}</td><td>{x.reason}{x.reviewDate ? <div className="ops-meta">review {x.reviewDate}</div> : null}</td><td>{when(x.at)}</td></tr>)}</tbody></table></div></section>
  </>);
}
function PendingRow({ p, D, persona, confirm }: { p: Project; D: ReturnType<typeof useDecisions>; persona: string; confirm: ReturnType<typeof useConfirm>['ask'] }) {
  const [reason, setReason] = useState(''); const [review, setReview] = useState(''); const can = holds(persona, 'project.decide');
  return (
    <li className="ops-match" data-project={p.id}>
      <div className="ops-row"><b>{p.name}</b><Tag tone="warn">decision pending</Tag><span className="ops-meta">{p.id} · scope rev {p.scopeRev} · brief v{p.brief.rev} by {personaLabel(p.brief.authorId)} · approver {personaLabel(p.approverId)} · ROM {money(p.romUsd)} (not a quote)</span></div>
      <p className="ops-note">{p.summary}</p>
      {can ? <div className="ops-form">
        <div className="ops-row"><label className="ops-field">Reason <span className="ops-meta">(required to hold or reject)</span><input type="text" value={reason} onChange={(e) => setReason(e.target.value)} data-testid="dec-reason" /></label>
          <label className="ops-field">Review date <span className="ops-meta">(required to hold)</span><input type="date" value={review} onChange={(e) => setReview(e.target.value)} data-testid="dec-review" /></label></div>
        <div className="ops-row">
          <button type="button" className="ui-btn ui-btn--primary" onClick={() => D.apply((x) => decide(x, persona, p.id, 'approve', reason, null))} data-testid="dec-approve">Approve</button>
          <button type="button" className="ui-btn" onClick={() => D.apply((x) => decide(x, persona, p.id, 'hold', reason, review || null))} data-testid="dec-hold">Hold</button>
          <button type="button" className="ui-btn ui-btn--danger" data-testid="dec-reject" onClick={() => { if (reason.trim().length < 8) { D.apply((x) => decide(x, persona, p.id, 'reject', reason, null)); return; } confirm({ key: 'decisions.reject', title: `Reject ${p.name}?`, object: p.id, actionLabel: 'Reject the project', consequence: <>The project is rejected at scope revision {p.scopeRev} with your reason: “{reason.trim()}”.</>, onConfirm: () => D.apply((x) => decide(x, persona, p.id, 'reject', reason, null)) }); }}>Reject…</button>
        </div></div> : <NotYours who="Executive / Sponsor" what="Deciding" />}
    </li>
  );
}
function FundRow({ p, D, persona }: { p: Project; D: ReturnType<typeof useDecisions>; persona: string }) {
  const [f, setF] = useState({ amount: String(p.romUsd), currency: 'USD', costCenter: '', scopeRev: String(p.scopeRev) }); const can = holds(persona, 'funding.authorize');
  return (
    <li className="ops-match" data-project={p.id}>
      <div className="ops-row"><b>{p.name}</b><Tag tone="ok">approved</Tag><span className="ops-meta">scope rev {p.scopeRev} · ROM {money(p.romUsd)}</span></div>
      {funded(D.d, p.id) ? null : can ? <div className="ops-row">
        <label className="ops-field">Amount<input type="number" min="0" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
        <label className="ops-field">Cost center<input type="text" value={f.costCenter} onChange={(e) => setF({ ...f, costCenter: e.target.value })} data-testid="fund-cc" /></label>
        <label className="ops-field">Scope revision<input type="number" min="1" value={f.scopeRev} onChange={(e) => setF({ ...f, scopeRev: e.target.value })} data-testid="fund-rev" /></label>
        <button type="button" className="ui-btn ui-btn--primary" onClick={() => D.apply((x) => fund(x, persona, p.id, { amount: Number(f.amount), currency: f.currency, costCenter: f.costCenter, scopeRev: Number(f.scopeRev) }))} data-testid="fund">Authorize funding</button></div>
        : <NotYours who="Finance / Budget Authority (shown here through the Product Architect perspective)" what="Signing the funding" />}
    </li>
  );
}

function MemoryView({ D, persona, confirm, offerUndo }: { D: ReturnType<typeof useDecisions>; persona: string; confirm: ReturnType<typeof useConfirm>['ask']; offerUndo: ReturnType<typeof useUndo>['offer'] }) {
  const [open, setOpen] = useState(false); const [m, setM] = useState({ name: '', on: '', options: '', why: '' });
  const can = MEMORY_AUTHORITIES.some((a) => holds(persona, a));
  return (<>
    <div className="ops-row"><span className="ops-note"><b>{D.d.memory.length}</b> decisions on record.</span>{can && !open && <button type="button" className="ui-btn ui-btn--primary" onClick={() => setOpen(true)} data-testid="mem-new">Record a decision</button>}</div>
    {open && <form className="ops-card ops-form" onSubmit={(e) => { e.preventDefault(); const r = D.apply((x) => record(x, persona, m)); if (r && 'id' in r) { setOpen(false); setM({ name: '', on: '', options: '', why: '' }); } }} data-testid="mem-form">
      <label className="ops-field">What was decided<input type="text" maxLength={140} value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} data-testid="mem-name" /></label>
      <label className="ops-field">On<select value={m.on} onChange={(e) => setM({ ...m, on: e.target.value })}><option value="">Nothing in particular</option>{D.d.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}<option value="R-ATL-4-218">Atlas 4.218 Boardroom</option></select></label>
      <label className="ops-field">Options considered, separated by semicolons<input type="text" maxLength={240} value={m.options} onChange={(e) => setM({ ...m, options: e.target.value })} /></label>
      <label className="ops-field">Why <span className="ops-meta">(required, {m.why.length}/250)</span><textarea maxLength={250} rows={3} value={m.why} onChange={(e) => setM({ ...m, why: e.target.value })} data-testid="mem-why" /></label>
      <div className="ops-row"><button type="submit" className="ui-btn ui-btn--primary" data-testid="mem-save">Record the decision</button><button type="button" className="ui-btn" onClick={() => setOpen(false)}>Cancel</button></div></form>}
    <ul className="ops-list" data-testid="memory">{D.d.memory.map((x) => (
      <li key={x.id} className="ops-card" data-memory={x.id}>
        <div className="ops-row"><span className="ops-meta">{x.id} · {when(x.at)}{x.seeded ? '' : ' · recorded in this demonstration'}</span></div>
        <h3>{x.name}</h3>
        <dl className="ops-kv"><dt>On</dt><dd>{x.on ? D.d.projects.find((p) => p.id === x.on)?.name || x.on : '—'}</dd><dt>Decided by</dt><dd>{personaLabel(x.by)}</dd><dt>Why</dt><dd>{x.why}</dd>
          {x.options.length ? <><dt>Options weighed</dt><dd>{x.options.join('; ')}</dd></> : null}<dt>What happened after</dt><dd>{x.after || 'Not recorded yet.'}</dd></dl>
        {mayWithdraw(x, persona) && <div><button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" data-testid="mem-withdraw" onClick={() => confirm({ key: 'decisions.withdraw', title: `Withdraw “${x.name}”?`, object: x.id, actionLabel: 'Withdraw the decision', consequence: <>The decision leaves Decision Memory. The withdrawal itself stays in the ledger.</>,
          onConfirm: () => { const prev = D.snapshot(); D.apply((y) => withdraw(y, persona, x.id)); offerUndo({ label: `“${x.name}” was withdrawn`, undo: () => D.restore(prev) }); } })}>Withdraw my decision</button></div>}
      </li>))}</ul>
  </>);
}
