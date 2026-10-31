/**
 * ServiceHands (P6-A) in the enterprise application: the service queue and the work-order record on @empathia/service-engine's
 * machine, over the API. The page shows a step as available only when the caller holds the authority the transition names and the
 * server's guard reports no blockers; the server decides again on every request. Candidates, gates, scores and blockers all come
 * from GET /v1/work-orders/{code} — the page computes no verdict of its own.
 */
import { useState } from 'react';
import { Button, DataTable, Drawer, Empty, ErrorState, Facts, Field, Loading, Notice, Tabs, Tag, type Column } from '@empathia/ui';
import { api, useMutation, useQuery } from '../api.js';
import { useMe } from '../me.js';
import { href } from '../router.js';

type Tone = 'ok' | 'warn' | 'bad' | 'muted' | 'info';
interface Row { code: string; state: string; workType: string; severity: string | null; sla: { respond: string; restore: string } | null; issue: { code: string; title: string }; room: { code: string; name: string; building: string }; assignee: { id: string; name: string } | null; createdAt: string; reopenCount: number; evidenceCount: number }
interface Step { to: string; authority: string; guard: string; yours: boolean; blockers: string[] }
interface Candidate { id: string; name: string; internal: boolean; hardOk: boolean; hardFails: string[]; score: number; reasons: string[]; coversSite: boolean }
interface Check { id: string; label: string; ok: boolean; why: string }
interface Record_ extends Row {
  note: string; triage: { scope: string; risk: string; byRole: string; at: string } | null; window: { from: string; to: string | null } | null; assignment: { score: number; reasons: string[] } | null; acceptedAt: string | null;
  preflight: { ok: boolean; checks: Check[]; at: string } | null; startedAt: string | null; evidence: Array<{ kind: string; note: string; ref: string | null; recorderId: string; at: string }>; verification: { outcome: string; note: string; verifierId: string; at: string } | null;
  customerPolicy: { needsCustomerConfirmation: boolean; confirmed: boolean }; closedAt: string | null; closingNote: string | null; need: { certs: string[]; experience: Record<string, string>; tools: string[]; parts: string[] };
  nextSteps: Step[]; candidates: { need: unknown; eligible: Candidate[]; ineligible: Candidate[]; none: boolean; whyNone: string | null; today: string } | null; events: Array<{ kind: string; detail: Record<string, unknown>; actor: string | null; at: string }>; workTypes: string[]; severities: string[];
}
const TONE: Record<string, Tone> = { OPEN: 'warn', TRIAGED: 'info', ASSIGNED: 'info', ACCEPTED: 'info', IN_PROGRESS: 'info', VERIFYING: 'warn', RESOLVED: 'ok', CLOSED: 'muted', REOPENED: 'bad', CANCELLED: 'muted' };
const tone = (s: string): Tone => TONE[s] || 'muted';
const when = (s: string | null | undefined) => (s ? s.slice(0, 16).replace('T', ' ') : '—');
const call = (op: string, args: Record<string, unknown>) => api.call(op as never, args as never) as Promise<unknown>;
const STATES = ['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'RESOLVED', 'CLOSED', 'REOPENED'];
const ACTIVE = new Set(['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'VERIFYING', 'REOPENED']);

// ------------------------------------------------------------------------------------------------------------ the queue
export function ServiceQueue() {
  const q = useQuery<{ items: Row[] }>('work-orders', () => call('getV1WorkOrders', {}) as Promise<{ items: Row[] }>);
  const [tab, setTab] = useState('active');
  if (q.error) return <section className="page"><ErrorState error={q.error} retry={q.reload} /></section>;
  if (!q.data) return <section className="page"><Loading label="Reading the service queue" /></section>;
  const rows = q.data.items.filter((x) => (tab === 'active' ? ACTIVE.has(x.state) : tab === 'mine' ? false : !ACTIVE.has(x.state)));
  const cols: Column<Row>[] = [
    { key: 'code', header: 'Work order', render: (x) => <a href={href('service', x.code)} className="mono">{x.code}</a> },
    { key: 'state', header: 'State', render: (x) => <Tag tone={tone(x.state)}>{x.state}</Tag>, sort: (x) => STATES.indexOf(x.state) },
    { key: 'sev', header: 'Severity · SLA', render: (x) => x.severity ? <span>{x.severity} <span className="ui-meta">· restore {x.sla?.restore}</span></span> : <span className="ui-muted">not triaged</span> },
    { key: 'issue', header: 'Deficiency', render: (x) => <div><div>{x.issue.title}</div><div className="ui-meta mono">{x.issue.code}</div></div> },
    { key: 'room', header: 'Room', render: (x) => <a href={href('rooms', x.room.code)}>{x.room.name}</a> },
    { key: 'who', header: 'Technician', render: (x) => x.assignee ? x.assignee.name : <span className="ui-muted">—</span> },
    { key: 'type', header: 'Work', render: (x) => <span className="ui-meta">{x.workType.replace(/_/g, ' ')}{x.reopenCount ? ` · reopened ×${x.reopenCount}` : ''}</span> },
  ];
  return (
    <section className="page">
      <header className="page__head"><div><p className="kicker">ServiceHands · incident to service</p><h1>Service queue</h1><p className="ui-meta">People are hard-gated before any ranking, the ranking explains itself, verification is separated from the work, and closing a work order never passes a test.</p></div></header>
      <Tabs label="Work orders" active={tab} onChange={setTab} tabs={[{ key: 'active', label: 'Active', count: q.data.items.filter((x) => ACTIVE.has(x.state)).length }, { key: 'done', label: 'Resolved and closed', count: q.data.items.filter((x) => !ACTIVE.has(x.state)).length }]} />
      <DataTable rows={rows} columns={cols} rowKey={(x) => x.code} caption="Work orders" empty={<Empty title="No work orders here">A work order is raised from an installation or commissioning deficiency on a room.</Empty>} />
    </section>
  );
}

// ------------------------------------------------------------------------------------------------------------ the record
export function WorkOrderRecord({ code }: { code: string }) {
  const { me } = useMe();
  const key = `work-order:${code}`;
  const q = useQuery<Record_>(key, () => call('getV1WorkOrdersWorkOrder', { params: { workOrder: code } }) as Promise<Record_>);
  const act = useMutation((a: { op: string; body?: Record<string, unknown> }) => call(a.op, { params: { workOrder: code }, ...(a.body ? { body: a.body } : {}) }), [key, 'work-orders']);
  const [drawer, setDrawer] = useState<string | null>(null);
  if (q.error) return <section className="page"><ErrorState error={q.error} retry={q.reload} /></section>;
  if (!q.data) return <section className="page"><Loading label="Reading the work order" /></section>;
  const w = q.data;
  const run = async (op: string, body?: Record<string, unknown>) => { const ok = (await act.run({ op, body })) !== undefined; if (ok) setDrawer(null); return ok; };
  const step = (to: string) => w.nextSteps.find((s) => s.to === to);
  const mine = w.assignee?.id === me?.person.id;
  const button = (s: Step) => {
    if (!s.yours) return null;
    const map: Record<string, [string, string | null]> = { TRIAGED: ['Triage', 'triage'], ASSIGNED: ['Assign a technician', 'assign'], ACCEPTED: ['Accept the job', null], IN_PROGRESS: ['Start the work', null], VERIFYING: ['Hand over for verification', null], RESOLVED: ['Verify', 'verify'], CLOSED: ['Close', 'close'], REOPENED: ['Reopen', 'reopen'] };
    const m = map[s.to]; if (!m) return null;
    const ops: Record<string, string> = { ACCEPTED: 'postV1WorkOrdersWorkOrderAccept', IN_PROGRESS: 'postV1WorkOrdersWorkOrderStart', VERIFYING: 'postV1WorkOrdersWorkOrderSubmit' };
    return <Button small kind="primary" busy={act.busy} onClick={() => (m[1] ? setDrawer(m[1]) : void run(ops[s.to]!))} disabled={s.blockers.length > 0 && !m[1]}>{m[0]}</Button>;
  };
  return (
    <section className="page" data-testid="work-order">
      <header className="page__head"><div><p className="kicker"><a href={href('service')}>Service queue</a> · {w.workType.replace(/_/g, ' ')}</p><h1>{w.issue.title}</h1><p className="ui-meta mono">{w.code} · {w.issue.code} · <a href={href('rooms', w.room.code)}>{w.room.name}</a> ({w.room.building})</p></div>
        <div className="stack" data-testid="wo-state"><Tag tone={tone(w.state)}>{w.state}</Tag>{w.severity ? <Tag tone={w.severity === 'Standard' ? 'muted' : 'warn'}>{w.severity}</Tag> : null}{w.assignee ? <Tag tone="info">{w.assignee.name}</Tag> : null}</div></header>
      <ol className="stages" aria-label="Service stage" data-testid="wo-stages">{STATES.filter((s) => s !== 'REOPENED').map((s, i) => { const n = STATES.indexOf(w.state === 'REOPENED' ? 'OPEN' : w.state); return <li key={s} className={i < n ? 'done' : i === n ? 'now' : ''}><span className="stages__n">{i + 1}</span>{s.toLowerCase().replace(/_/g, ' ')}</li>; })}</ol>
      {act.error ? <ErrorState error={act.error} /> : null}

      <section className="card stack" data-testid="wo-next"><h2 className="h3">Next governed step</h2>
        {w.state === 'CLOSED' ? <Notice tone="ok">Closed {when(w.closedAt)} — {w.closingNote || 'no note'}. Closing a work order never passes a test: the deficiency resolves only with a verified retest on the room.</Notice> : null}
        <ul className="steps">{w.nextSteps.map((s) => <li key={s.to}><b>{w.state} → {s.to}</b> <span className="ui-meta">{s.authority} · guard {s.guard}{s.yours ? '' : ' · not your authority'}</span>
          {s.blockers.length ? <ul className="why">{s.blockers.map((b) => <li key={b}>{b}</li>)}</ul> : null}
          <span className="row-actions">{button(s)}</span></li>)}</ul>
      </section>

      <div className="two">
        <section className="card stack"><h2 className="h3">Triage</h2>
          {w.triage ? <Facts items={[['Severity · SLA', `${w.severity} · respond ${w.sla?.respond}, restore ${w.sla?.restore}`], ['Scope', w.triage.scope], ['Risk', w.triage.risk], ['Window', w.window ? `${when(w.window.from)} → ${when(w.window.to)}` : 'none (the booking check will fail)'], ['By', `${w.triage.byRole} · ${when(w.triage.at)}`]]} /> : <p className="ui-meta">Not triaged. {w.note ? `Raised with: “${w.note}”` : ''}</p>}
          <p className="ui-meta">This work needs: {w.need.certs.join(', ')}{Object.keys(w.need.experience).length ? ` · experience ${Object.entries(w.need.experience).map(([k, v]) => `${k} ${v}`).join(', ')}` : ''} · tools {w.need.tools.join(', ') || 'none'} · parts {w.need.parts.join(', ') || 'none'}</p>
        </section>
        <section className="card stack"><h2 className="h3">Assignment</h2>
          {w.assignment && w.assignee ? <><p><b>{w.assignee.name}</b> · score {w.assignment.score}{w.acceptedAt ? ` · accepted ${when(w.acceptedAt)}` : ' · not yet accepted'}</p><ul className="plain">{w.assignment.reasons.map((r) => <li key={r} className="ui-meta">{r}</li>)}</ul></> : <p className="ui-meta">No technician assigned.</p>}
        </section>
      </div>

      {w.candidates ? <section className="card stack" data-testid="wo-candidates"><h2 className="h3">Candidates · hard gates first, then an explained ranking</h2>
        {w.candidates.none ? <Notice tone="warn">{w.candidates.whyNone}</Notice> : null}
        <ul className="plain">{w.candidates.eligible.map((c) => <li key={c.id} className="cand"><Tag tone="ok">eligible</Tag> <b>{c.name}</b> <span className="ui-meta">score {c.score} · {c.reasons.join(' · ')}</span> {step('ASSIGNED')?.yours ? <Button small kind="primary" busy={act.busy} onClick={() => void run('postV1WorkOrdersWorkOrderAssign', { personId: c.id })}>Assign</Button> : null}</li>)}
          {w.candidates.ineligible.map((c) => <li key={c.id} className="cand off"><Tag tone="bad">ineligible</Tag> <b>{c.name}</b> <ul className="why">{c.hardFails.map((f) => <li key={f}>{f}</li>)}</ul></li>)}</ul>
      </section> : null}

      <div className="two">
        <section className="card stack" data-testid="wo-preflight"><h2 className="h3">Dispatch preflight</h2>
          {w.preflight ? <ul className="plain">{w.preflight.checks.map((c) => <li key={c.id}><Tag tone={c.ok ? 'ok' : 'bad'}>{c.ok ? 'ok' : 'blocked'}</Tag> <b>{c.label}</b> <span className="ui-meta">{c.why}</span></li>)}</ul> : <p className="ui-meta">Not recorded. Every check is stored; a failed one blocks the start.</p>}
          {w.state === 'ACCEPTED' && mine ? <div><Button small onClick={() => setDrawer('preflight')}>Record the preflight</Button></div> : null}
        </section>
        <section className="card stack" data-testid="wo-evidence"><h2 className="h3">Field evidence</h2>
          {w.evidence.length ? <ul className="plain">{w.evidence.map((e, i) => <li key={i}><Tag tone="muted">{e.kind}</Tag> {e.note} {e.ref ? <span className="ui-meta mono">{e.ref}</span> : null} <span className="ui-meta">{when(e.at)}</span></li>)}</ul> : <p className="ui-meta">None recorded.</p>}
          {['IN_PROGRESS', 'VERIFYING'].includes(w.state) && mine ? <div><Button small onClick={() => setDrawer('evidence')}>Record evidence</Button></div> : null}
          {w.verification ? <Notice tone={w.verification.outcome === 'pass' ? 'ok' : 'warn'}><b>Verification {w.verification.outcome}</b> · {w.verification.note} <span className="ui-meta">{when(w.verification.at)}</span></Notice> : null}
        </section>
      </div>

      <section className="card stack"><h2 className="h3">Events</h2>
        <ul className="plain">{w.events.map((e, i) => <li key={i}><span className="ui-meta mono">{when(e.at)}</span> <b>{e.kind.replace('work_order.', '')}</b> <span className="ui-meta">{e.actor || 'system'}{e.detail['to'] ? ` → ${String(e.detail['to'])}` : ''}{e.detail['outcome'] ? ` · ${String(e.detail['outcome'])}` : ''}{e.detail['reason'] ? ` · ${String(e.detail['reason'])}` : ''}</span></li>)}</ul>
      </section>

      <ServiceDrawer id={drawer} w={w} onClose={() => setDrawer(null)} run={run} busy={act.busy} error={act.error} />
    </section>
  );
}

function ServiceDrawer({ id, w, onClose, run, busy, error }: { id: string | null; w: Record_; onClose: () => void; run: (op: string, body?: Record<string, unknown>) => Promise<boolean>; busy: boolean; error: unknown }) {
  const [f, setF] = useState<Record<string, string>>({});
  const v = (k: string, d = '') => f[k] ?? d; const set = (k: string) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const on = (k: string) => v(k) === 'on'; const toggle = (k: string) => (e: { target: { checked: boolean } }) => setF((x) => ({ ...x, [k]: e.target.checked ? 'on' : '' }));
  const close = () => { setF({}); onClose(); };
  const foot = (label: string, go: () => Promise<boolean>) => <><Button onClick={close}>Cancel</Button><Button kind="primary" busy={busy} onClick={async () => { if (await go()) setF({}); }}>{label}</Button></>;
  const err = error ? <ErrorState error={error as never} /> : null;
  switch (id) {
    case 'triage': return <Drawer open title="Triage" onClose={close} footer={foot('Triage', () => run('postV1WorkOrdersWorkOrderTriage', { severity: v('severity', 'Standard'), scope: v('scope'), risk: v('risk'), workType: v('type', w.workType), ...(v('from') ? { window: { from: new Date(v('from')).toISOString(), to: v('to') ? new Date(v('to')).toISOString() : undefined } } : {}) }))}>
      <Field label="Severity" hint="Sets the SLA; anything above Standard needs the requester’s confirmation before closure">{(i) => <select id={i} value={v('severity', 'Standard')} onChange={set('severity')}>{w.severities.map((s) => <option key={s}>{s}</option>)}</select>}</Field>
      <Field label="Work type" hint="Decides the certifications, experience, tools and parts the gates and the preflight check">{(i) => <select id={i} value={v('type', w.workType)} onChange={set('type')}>{w.workTypes.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select>}</Field>
      <Field label="Scope">{(i) => <textarea id={i} rows={2} value={v('scope')} onChange={set('scope')} />}</Field><Field label="Risk">{(i) => <textarea id={i} rows={2} value={v('risk')} onChange={set('risk')} />}</Field>
      <div className="two"><Field label="Window from">{(i) => <input id={i} type="datetime-local" value={v('from')} onChange={set('from')} />}</Field><Field label="Window to">{(i) => <input id={i} type="datetime-local" value={v('to')} onChange={set('to')} />}</Field></div>{err}</Drawer>;
    case 'preflight': return <Drawer open title="Dispatch preflight" onClose={close} footer={foot('Record', () => run('postV1WorkOrdersWorkOrderPreflight', { safetyBriefed: on('brief'), heightPermit: on('height'), accessConfirmedBy: v('access') || undefined, toolsConfirmed: w.need.tools.filter((t) => on(`tool:${t}`)), stock: Object.fromEntries(w.need.parts.filter((p) => v(`part:${p}`)).map((p) => [p, { onHand: Number(v(`part:${p}`)), checkedAt: new Date().toISOString() }])) }))}>
      <Notice tone="info">Every check is recorded as you declare it; a failed check blocks the start and says why. Declarations are yours and are audited.</Notice>
      <Field label="Site access confirmed by" hint="Facilities or the site champion">{(i) => <input id={i} value={v('access')} onChange={set('access')} />}</Field>
      <label className="check"><input type="checkbox" checked={on('brief')} onChange={toggle('brief')} /> Safety brief acknowledged</label>
      {w.need.certs.includes('lic.working_at_height') ? <label className="check"><input type="checkbox" checked={on('height')} onChange={toggle('height')} /> Working-at-height permit in hand</label> : null}
      <fieldset className="dims"><legend>Tools confirmed</legend>{w.need.tools.map((t) => <label key={t} className="check"><input type="checkbox" checked={on(`tool:${t}`)} onChange={toggle(`tool:${t}`)} /> {t}</label>)}</fieldset>
      {w.need.parts.length ? <fieldset className="dims"><legend>Parts on hand (counted now)</legend>{w.need.parts.map((p) => <Field key={p} label={p}>{(i) => <input id={i} type="number" min={0} value={v(`part:${p}`)} onChange={set(`part:${p}`)} />}</Field>)}</fieldset> : null}{err}</Drawer>;
    case 'evidence': return <Drawer open title="Record field evidence" onClose={close} footer={foot('Record', () => run('postV1WorkOrdersWorkOrderEvidence', { kind: v('kind', 'note'), note: v('note'), ref: v('ref') || undefined }))}>
      <Field label="Kind">{(i) => <select id={i} value={v('kind', 'note')} onChange={set('kind')}>{['photo', 'measurement', 'note', 'part', 'readback'].map((k) => <option key={k}>{k}</option>)}</select>}</Field>
      <Field label="What was done or observed">{(i) => <textarea id={i} rows={3} value={v('note')} onChange={set('note')} />}</Field><Field label="Reference (evidence id, photo name)">{(i) => <input id={i} value={v('ref')} onChange={set('ref')} />}</Field>{err}</Drawer>;
    case 'verify': return <Drawer open title="Verify the work" onClose={close} footer={foot('Record the verification', () => run('postV1WorkOrdersWorkOrderVerify', { outcome: v('outcome', 'pass'), note: v('note') }))}>
      <Notice tone="info">Separation of duties: the technician and anyone who recorded evidence cannot verify. A fail keeps the job in verification for more field work.</Notice>
      <Field label="Outcome">{(i) => <select id={i} value={v('outcome', 'pass')} onChange={set('outcome')}><option value="pass">pass</option><option value="fail">fail</option></select>}</Field>
      <Field label="Note">{(i) => <textarea id={i} rows={3} value={v('note')} onChange={set('note')} />}</Field>{err}</Drawer>;
    case 'close': return <Drawer open title="Close the work order" onClose={close} footer={foot('Close', () => run('postV1WorkOrdersWorkOrderClose', { note: v('note'), customerConfirmed: on('confirmed') }))}>
      <Notice tone="info">Closing records the field work. It never passes a test: the deficiency on the room resolves only with a verified retest.</Notice>
      {w.customerPolicy.needsCustomerConfirmation ? <label className="check"><input type="checkbox" checked={on('confirmed')} onChange={toggle('confirmed')} /> The requester confirmed the room is back in service ({w.severity} severity policy)</label> : null}
      <Field label="Closing note">{(i) => <textarea id={i} rows={2} value={v('note')} onChange={set('note')} />}</Field>{err}</Drawer>;
    case 'reopen': return <Drawer open title="Reopen" onClose={close} footer={foot('Reopen', () => run('postV1WorkOrdersWorkOrderReopen', { reason: v('reason') }))}>
      <Field label="Reason" hint="Recurrence or failed verification; the job is triaged again">{(i) => <textarea id={i} rows={2} value={v('reason')} onChange={set('reason')} />}</Field>{err}</Drawer>;
    default: return null;
  }
}
