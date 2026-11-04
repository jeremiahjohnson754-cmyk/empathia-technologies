/**
 * Dispatch board — the Service Delivery Command Center (#/service; #/service?view=list; #/service/coverage). The service manager's queue
 * as a board with a list alternative (no drag-only interaction: every move is a button), the explained resource match for a triaged job
 * (gates and preferences apart; hard gates never overridden; a preference override needs a reason), assignment as an explicit labelled
 * demonstration action, reassignment and withdrawal with reasons, coverage, and metrics computed from the records.
 */
import { useMemo, useState } from 'react';
import { SLA } from '@empathia/service-engine';
import { Tag } from '@empathia/ui';
import * as S from '../workspace/store.js';
import type { WorkspaceProps } from '../hardening/lazy.js';
import { OpsHead, Refused, NotYours, holds, param, when, personaLabel, dx, type WX } from '../hardening/kit.js';
import { useOps } from '../hardening/useOps.js';
import { opsPath } from '../hardening/path.js';
import { useConfirm, useUndo } from '../safeguards/Safeguards.js';
import { COLUMNS, DECLARED, metrics, slaOf, competencies, poolOf, NO_TRAVEL, OVERRIDE_MIN, type Match } from './engine.js';
import { matchFor, dispatchAssign, dispatchReassign, dispatchWithdraw } from './actions.js';

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { OPEN: 'warn', TRIAGED: 'info', ASSIGNED: 'info', ACCEPTED: 'info', IN_PROGRESS: 'info', VERIFYING: 'warn', RESOLVED: 'ok', CLOSED: 'muted', REOPENED: 'bad', CANCELLED: 'muted', 'Mission critical': 'bad', High: 'warn', Standard: 'muted', ok: 'ok', met: 'ok', 'at risk': 'warn', breached: 'bad' };

export default function Dispatch({ perspective, hash }: WorkspaceProps) {
  const ops = useOps(perspective); const { w, persona } = ops;
  const confirm = useConfirm(); const undo = useUndo();
  const p = opsPath(hash); const view = p[1] === 'coverage' ? 'coverage' : param(hash, 'view') === 'list' ? 'list' : 'board';
  const live = w.incidents.filter((i) => !['CLOSED', 'CANCELLED'].includes(i.state));
  const sel = param(hash, 'id'); const inc = sel ? S.incidentOf(w, sel) || null : null;
  const nowMs = Date.now(); const M = metrics(w.incidents, nowMs);
  const go = (q: string) => { location.hash = `#/service${q}`; };
  const pick = (id: string) => go(`?${view === 'list' ? 'view=list&' : ''}id=${id}`);
  const doReset = () => confirm.ask({ key: 'dispatch.reset', title: 'Reset the demonstration workspace?', object: 'reset workspace', actionLabel: 'Reset the workspace', consequence: <>Every incident, work order, assignment, override, lab result in the ledger and APEX or Learn case in <b>this browser</b> returns to the seed. Nothing outside this browser is affected.</>, onConfirm: () => { const prev = ops.resetAll(); undo.offer({ label: 'the workspace was reset to the seed', undo: () => ops.restore(prev) }); } });
  return (
    <section className="ops" data-testid="dispatch">
      <OpsHead product="servicehands" kicker="ServiceHands · Service Delivery Command Center" title="Dispatch board" persona={persona}
        lead={<>Jobs move one governed step at a time. People are hard-gated before any ranking, and the ranking explains itself.</>}
        actions={<button type="button" className="ui-btn ui-btn--quiet" onClick={doReset} data-testid="reset-workspace">Reset workspace</button>} />
      {undo.bar}
      <Refused r={ops.refusal} />
      <div className="ops-stats" data-testid="metrics">
        <Stat label="Open" v={M.open.value} def={M.open.def} /><Stat label="Waiting for a person" v={M.waiting.value} def={M.waiting.def} />
        <Stat label="SLA at risk or breached" v={M.risk.value} def={M.risk.def} /><Stat label="Mean time to assign" v={M.assign.value === null ? '—' : `${M.assign.value} h`} def={M.assign.def} />
        <Stat label="Reopened" v={M.reopened.value} def={M.reopened.def} />
      </div>
      <nav className="ops-tabs" aria-label="Dispatch views">
        <a href="#/service" aria-current={view === 'board' ? 'page' : undefined}>Board</a>
        <a href="#/service?view=list" aria-current={view === 'list' ? 'page' : undefined}>List</a>
        <a href="#/service/coverage" aria-current={view === 'coverage' ? 'page' : undefined}>Coverage</a>
      </nav>
      {view === 'coverage' ? <Coverage w={w} /> : (
        <div className="ops-grid ops-grid--2b">
          <div>{view === 'board' ? <Board w={w} live={live} sel={sel} pick={pick} nowMs={nowMs} /> : <List w={w} live={live} sel={sel} pick={pick} nowMs={nowMs} />}</div>
          <div>{inc ? <Detail key={inc.id} w={w} inc={inc} ops={ops} persona={persona} nowMs={nowMs} confirm={confirm.ask} offerUndo={undo.offer} />
            : <div className="ops-card"><h2>Pick a job</h2><p className="ops-note">Choose a card on the board or a row in the list to see its facts, its SLA, and — once it is triaged — who may do the work and why.</p></div>}</div>
        </div>)}
      {confirm.dialog}
    </section>
  );
}

function Stat({ label, v, def }: { label: string; v: number | string; def: string }) { return <div className="ops-stat"><b>{v}</b><span>{label}</span><small>{def}</small></div>; }

function JobCard({ w, i, sel, pick, nowMs }: { w: WX; i: S.Incident; sel: string | null; pick: (id: string) => void; nowMs: number }) {
  const s = slaOf(i.severity, i.openedAt, i.restoredAt, nowMs); const wo = i.workOrderId ? S.workOrderOf(w, i.workOrderId) : undefined;
  return (
    <button type="button" className="ops-job" aria-pressed={sel === i.id} onClick={() => pick(i.id)} data-job={i.id}>
      <b>{i.title}</b>
      <span className="ops-meta">{i.id} · {i.roomName}</span>
      <span className="ops-row"><Tag tone={TONE[i.severity]}>{i.severity}</Tag><Tag tone={TONE[s.state]}>SLA {s.state}</Tag>{wo?.techId ? <span className="ops-meta">{S.techOf(w, wo.techId)?.name || poolOf(w.staff).find((x) => x.id === wo.techId)?.name}</span> : null}</span>
    </button>
  );
}
function Board({ w, live, sel, pick, nowMs }: { w: WX; live: S.Incident[]; sel: string | null; pick: (id: string) => void; nowMs: number }) {
  return (
    <div className="ops-board" data-testid="board">
      {COLUMNS.map((c) => { const jobs = live.filter((i) => c.states.includes(i.state)); return (
        <section key={c.key} className="ops-col" aria-labelledby={`col-${c.key}`}><h3 id={`col-${c.key}`}>{c.label}<span>{jobs.length}</span></h3>
          {jobs.length ? jobs.map((i) => <JobCard key={i.id} w={w} i={i} sel={sel} pick={pick} nowMs={nowMs} />) : <p className="ops-meta">Nothing here.</p>}
        </section>); })}
    </div>
  );
}
function List({ w, live, sel, pick, nowMs }: { w: WX; live: S.Incident[]; sel: string | null; pick: (id: string) => void; nowMs: number }) {
  const rows = [...live].sort((a, b) => slaOf(a.severity, a.openedAt, a.restoredAt, nowMs).hoursLeft - slaOf(b.severity, b.openedAt, b.restoredAt, nowMs).hoursLeft);
  return (
    <div className="ops-table-wrap" data-testid="list"><table className="ops-table"><caption className="ui-sr">Open jobs, soonest restore deadline first</caption>
      <thead><tr><th scope="col">Job</th><th scope="col">State</th><th scope="col">Severity</th><th scope="col">Restore by</th><th scope="col">Technician</th></tr></thead>
      <tbody>{rows.map((i) => { const s = slaOf(i.severity, i.openedAt, i.restoredAt, nowMs); const wo = i.workOrderId ? S.workOrderOf(w, i.workOrderId) : undefined; return (
        <tr key={i.id} className={sel === i.id ? 'on' : ''}><td><a href={`#/service?view=list&id=${i.id}`} onClick={(e) => { e.preventDefault(); pick(i.id); }}>{i.id} · {i.title}</a><div className="ops-meta">{i.roomName}</div></td>
          <td><Tag tone={TONE[i.state]}>{i.state}</Tag></td><td>{i.severity}</td><td>{when(s.due)} <Tag tone={TONE[s.state]}>{s.state}</Tag></td><td>{S.techOf(w, wo?.techId || null)?.name || '—'}</td></tr>); })}</tbody></table></div>
  );
}

function Detail({ w, inc, ops, persona, nowMs, confirm, offerUndo }: { w: WX; inc: S.Incident; ops: ReturnType<typeof useOps>; persona: string; nowMs: number; confirm: ReturnType<typeof useConfirm>['ask']; offerUndo: ReturnType<typeof useUndo>['offer'] }) {
  const wo = inc.workOrderId ? S.workOrderOf(w, inc.workOrderId) : undefined; const s = slaOf(inc.severity, inc.openedAt, inc.restoredAt, nowMs);
  const [sev, setSev] = useState(inc.severity); const [lang, setLang] = useState(''); const [tz, setTz] = useState('');
  const [why, setWhy] = useState(''); const [to, setTo] = useState(''); const [rwhy, setRwhy] = useState('');
  const m = useMemo(() => matchFor(w, inc.id, { language: lang || null, timeZone: tz || null }), [w, inc.id, lang, tz]);
  const canTriage = holds(persona, 'service.triage'); const canAssign = holds(persona, 'service.assign');
  const events = w.events.filter((e) => e.aggregate === inc.id || (wo && e.aggregate === wo.id)).slice(0, 8);
  const ov = dx(w).overrides.find((o) => o.woId === wo?.id);
  return (
    <div className="ops-card" data-testid="job-detail" aria-labelledby="job-h">
      <h2 id="job-h">{inc.title} <Tag tone={TONE[inc.state]}>{inc.state}</Tag></h2>
      <dl className="ops-kv">
        <dt>Job</dt><dd>{inc.id}{wo ? ` · work order ${wo.id} (${wo.workType.replace(/_/g, ' ')})` : ' · no work order yet'}</dd>
        <dt>Room</dt><dd>{inc.roomName} ({inc.roomId})</dd>
        <dt>Severity</dt><dd>{inc.severity} — respond {(SLA as Record<string, { respond: string }>)[inc.severity]?.respond}, restore {s.promise}</dd>
        <dt>Restore by</dt><dd>{when(s.due)} · <Tag tone={TONE[s.state]}>{s.state}</Tag> <span className="ops-meta">business days counted as calendar days in this demonstration</span></dd>
        <dt>Technician</dt><dd>{S.techOf(w, wo?.techId || null)?.name || '—'}{ov ? <span className="ops-meta"> · chosen over rank 1: {ov.reason}</span> : null}</dd>
        {inc.recurrenceOf ? <><dt>Recurrence of</dt><dd>{inc.recurrenceOf} (whoever did that work is excluded)</dd></> : null}
      </dl>
      {['OPEN', 'REOPENED'].includes(inc.state) && (canTriage ? (
        <div className="ops-row"><label className="ops-field">Severity <select value={sev} onChange={(e) => setSev(e.target.value as S.Incident['severity'])}>{Object.keys(SLA).map((k) => <option key={k}>{k}</option>)}</select></label>
          <button type="button" className="ui-btn ui-btn--primary" onClick={() => ops.apply((x) => S.triage(x, persona, inc.id, sev))} data-testid="triage">Triage</button></div>
      ) : <NotYours who="Service Manager" what="Triage" />)}
      {inc.state === 'TRIAGED' && m && (canAssign ? (
        <section className="ops-gates" aria-labelledby="match-h" data-testid="matching">
          <h3 id="match-h">Who may do this work</h3>
          <p className="ops-note">Needs {m.need.certs.join(', ')}; experience {Object.entries(m.need.experience).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}; tools {m.need.tools.join(', ') || 'none'}. {NO_TRAVEL}</p>
          <div className="ops-row">
            <label className="ops-field">Declared language (preference) <select value={lang} onChange={(e) => setLang(e.target.value)} data-testid="pref-language"><option value="">No requirement</option>{['English', 'Spanish', 'German', 'Swedish', 'Gujarati'].map((l) => <option key={l}>{l}</option>)}</select></label>
            <label className="ops-field">Declared time zone (preference) <select value={tz} onChange={(e) => setTz(e.target.value)}><option value="">No requirement</option>{['America/New_York', 'America/Chicago'].map((l) => <option key={l}>{l}</option>)}</select></label>
          </div>
          {!m.eligible.length && <p className="ops-refused">No eligible person: every gate that fails is listed below. A hard gate is never overridden.</p>}
          <label className="ops-field">Reason for choosing someone other than the first-ranked person <span className="ops-meta">(required for a preference override, at least {OVERRIDE_MIN} characters, audited)</span>
            <textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} data-testid="override-reason" /></label>
          <ol className="ops-list">{m.rows.map((r) => <MatchRow key={r.id} r={r} onAssign={() => ops.apply((x) => dispatchAssign(x, persona, inc.id, r.id, why || null))} />)}</ol>
        </section>
      ) : <NotYours who="Service Manager" what="Choosing and assigning a technician" />)}
      {['ASSIGNED', 'ACCEPTED'].includes(inc.state) && m && (canAssign ? (
        <section className="ops-gates" aria-labelledby="re-h">
          <h3 id="re-h">Reassign or withdraw</h3>
          <div className="ops-row">
            <label className="ops-field">To (eligible people only) <select value={to} onChange={(e) => setTo(e.target.value)} data-testid="reassign-to"><option value="">Choose…</option>{m.eligible.filter((r) => r.id !== wo?.techId).map((r) => <option key={r.id} value={r.id}>{r.rank}. {r.name}</option>)}</select></label>
            <label className="ops-field">Reason <input type="text" value={rwhy} onChange={(e) => setRwhy(e.target.value)} data-testid="reassign-reason" /></label>
            <button type="button" className="ui-btn" onClick={() => ops.apply((x) => dispatchReassign(x, persona, inc.id, to, rwhy))} data-testid="reassign">Reassign</button>
          </div>
          <div><button type="button" className="ui-btn ui-btn--quiet" data-testid="withdraw" onClick={() => confirm({ key: 'dispatch.unassign', title: `Withdraw ${S.techOf(w, wo?.techId || null)?.name || 'the technician'} from ${wo?.id}?`, object: wo?.id || '', actionLabel: 'Withdraw the assignment', reason: { label: 'Why', min: 8 }, consequence: <>The job goes back to <b>Ready to assign</b> and the technician no longer sees it. The withdrawal and its reason are in the ledger.</>,
            onConfirm: (reason) => { const prev = ops.snapshot(); const r = ops.apply((x) => dispatchWithdraw(x, persona, inc.id, reason)); if (!r) offerUndo({ label: `the assignment on ${wo?.id} was withdrawn`, undo: () => ops.restore(prev) }); } })}>Withdraw the assignment</button></div>
        </section>
      ) : <NotYours who="Service Manager" what="Reassigning" />)}
      <p className="ops-row">
        {wo ? <a href={`#/servicehands/wo/${wo.id}`}>Open the work order in ServiceHands</a> : <a href={`#/servicehands?id=${inc.id}`}>Open in ServiceHands</a>}
        <a href={`#/v25/fi/scan/${inc.roomId}`}>Field Intelligence scan of the room</a><a href={`#/replay/${inc.roomId}`}>Replay the room</a><a href={`#/search?focus=Room:${inc.roomId}`}>Search Party</a>
      </p>
      <details><summary>Ledger for this job ({events.length})</summary><ul className="ops-list">{events.map((e, i) => <li key={i} className="ops-note"><Tag tone={e.outcome === 'DENIED' ? 'bad' : 'muted'}>{e.outcome}</Tag> {when(e.at)} · {e.type} · {personaLabel(e.by)} — {e.detail}</li>)}</ul></details>
    </div>
  );
}

function MatchRow({ r, onAssign }: { r: Match; onAssign: () => void }) {
  return (
    <li className={`ops-match${r.eligible ? '' : ' off'}`} data-candidate={r.id} data-eligible={r.eligible}>
      <div className="ops-row"><b>{r.rank ? `${r.rank}. ` : ''}{r.name}</b><span className="ops-meta">{r.org}</span>
        {r.eligible ? <Tag tone="ok">eligible · score {r.score}</Tag> : <Tag tone="bad">hard gate — cannot be overridden</Tag>}</div>
      <div className="ops-match__cols">
        <div><h4>Gates (all must pass)</h4><ul>{r.gates.map((g) => <li key={g.key} className={g.ok ? 'ops-ok' : 'ops-fail'}><b>{g.label}</b> <span className="ops-meta">{g.why}</span></li>)}</ul></div>
        <div><h4>Preferences (rank only)</h4>{r.prefs.length ? <ul>{r.prefs.map((p) => <li key={p.label}>{p.label} <span className="ops-meta">+{p.points} · {p.why}</span></li>)}</ul> : <p className="ops-meta">Not ranked: a gate fails.</p>}</div>
      </div>
      <p className="ops-meta">{r.competencies.map((c) => `${c.label} (${c.state})`).join(' · ')}</p>
      <div className="ops-row">{r.eligible
        ? <button type="button" className={`ui-btn ui-btn--sm ${r.rank === 1 ? 'ui-btn--primary' : ''}`} onClick={onAssign} data-testid="assign">Assign {r.name.split(' (')[0]} <span className="ui-sr">(demonstration workspace action)</span></button>
        : <button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" onClick={onAssign} title="The rule refuses this; try it to see the refusal recorded" data-testid="try-anyway">Try anyway</button>}</div>
    </li>
  );
}

function Coverage({ w }: { w: WX }) {
  const pool = poolOf(w.staff); const sites = ['ATL', 'NST'];
  return (
    <section className="ops-card" data-testid="coverage" aria-labelledby="cov-h">
      <h2 id="cov-h">Coverage</h2>
      <p className="ops-note">Who can work where, with their internal competencies and verification state. Languages and time zones are as each person declared them. {NO_TRAVEL}</p>
      <div className="ops-table-wrap"><table className="ops-table"><caption className="ui-sr">Technicians by site</caption>
        <thead><tr><th scope="col">Person</th>{sites.map((s) => <th key={s} scope="col">{s}</th>)}<th scope="col">Internal competencies</th><th scope="col">This week</th><th scope="col">Declared</th></tr></thead>
        <tbody>{pool.map((p) => <tr key={p.id}><th scope="row">{p.name}<div className="ops-meta">{p.internal ? 'Internal team' : `${p.orgName} · agreement ${p.agreement?.id} ${p.agreement?.status}`}</div></th>
          {sites.map((s) => <td key={s}>{p.sites.includes(s) || p.sites.includes('*') ? <span className="ops-ok">approved</span> : <span className="ops-fail">no access</span>}</td>)}
          <td className="ops-meta">{competencies(p).map((c) => `${c.label.replace('Internal competency · ', '')} — ${c.state}, to ${c.expires}`).join('; ')}</td>
          <td>{p.capacity.remaining} h{p.leave ? <div className="ops-meta">leave {p.leave.from} → {p.leave.to}</div> : null}</td>
          <td className="ops-meta">{DECLARED[p.id] ? `${DECLARED[p.id]!.languages.join(', ')} · ${DECLARED[p.id]!.timeZone}` : 'nothing declared'}</td></tr>)}</tbody></table></div>
    </section>
  );
}
