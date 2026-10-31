/**
 * P5 (ADR-0008): the governed project lifecycle in the enterprise application — the request desk (intake with the nine types, dimensions
 * that carry provenance) and the project record (the seven stages, the next governed steps with their blockers, briefs, decisions,
 * funding, design revisions with reviews and RFIs, rooms with their execution facts, the audit trail). Every action is behind the
 * authority the transition names; the page shows a step as available only when the caller holds that authority, and the server decides
 * again on every request. The page never computes a verdict of its own: blockers come from GET /v1/projects/{code}.
 */
import { useState } from 'react';
import { Button, DataTable, Drawer, Empty, ErrorState, Facts, Field, Loading, Notice, Tag, type Column } from '@empathia/ui';
import { api, newKey, useMutation, useQuery } from '../api.js';
import { useMe } from '../me.js';
import { href } from '../router.js';

type Tone = 'ok' | 'warn' | 'bad' | 'muted' | 'info';
interface RequestRow { code: string; type: string; title: string; state: string; site: string | null; project: string | null; photoPolicy: string; programme: boolean; createdAt: string; submittedAt: string | null }
interface Catalogue { requestTypes: Array<{ key: string; label: string; summary: string; source: string }>; governance: Array<{ from: string; to: string; role: string; authority: string; guard: string }>; delivery: Array<{ from: string; to: string; role: string; authority: string; guard: string }> }
interface Dim { name: string; value: string; unit: string; source: string; uncertainty: string }
interface Step { to: string; authority: string; guard: string; blockers?: string[] }
interface Project {
  code: string; name: string; type: string | null; state: string; governance: string; delivery: string | null; scopeRev: number; stage: { n: number; stage: string }; internalOnly: boolean; exceptionReason: string | null;
  approver: string | null; supportOwner: string | null; qaSignoffBy: string | null; rulePackVersion: string | null; fieldAuthorization: Record<string, unknown> | null;
  request: { code: string; type: string; title: string; intent: string; constraints: string; site: string | null; building: string | null; room: string | null; provisionalRoom: string | null; archetype: string | null; capacity: number | null; photoPolicy: string; photos: unknown[]; plans: unknown[]; dimensions: Array<{ name: string; value: number; unit: string; source: string; uncertainty: string }>; programme: boolean; state: string; requester: string; submittedAt: string | null } | null;
  briefs: Array<{ rev: number; scopeRev: number; author: string; content: { summary: string; requirements: string[]; assumptions: string[]; romUsd: number | null; romLabel: string | null; comparableRooms: string[] }; createdAt: string }>;
  decisions: Array<{ decision: string; scopeRev: number; decidedBy: string; delegated: boolean; reason: string; reviewDate: string | null; decidedAt: string }>;
  funding: Array<{ kind: string; amount: string; currency: string; costCenter: string; scopeRev: number; reason: string; recordedBy: string; recordedAt: string }>;
  design: Array<{ rev: number; author: string; reason: string; files: Array<{ name: string; kind?: string }>; divr: { intent: string; verificationPlan: string[] } | null; domainsNeeded: string[]; state: string; createdAt: string; liteModelRoom: string | null; reviews: Array<{ domain: string; decision: string; note: string; reviewedBy: string; reviewedAt: string }>; rfis: Array<{ code: string; question: string; raisedBy: string; raisedAt: string; answer: string | null; resolvedBy: string | null; resolvedAt: string | null }> }>;
  rooms: Array<{ code: string; lifecycle: string; hasPlan: boolean; applicable: number; verified: number; openIssues: number; drawingsApproved: boolean; photosApproved: boolean; hasBaseline: boolean }>;
  next: { governance: Step[]; delivery: Step[] }; audit: Array<{ action: string; outcome: string; by: string | null; at: string; detail: Record<string, unknown> }>;
}
const STAGES = ['intake', 'review', 'brief', 'approval', 'collaborative design', 'execution and handoff', 'operational transition'];
const TONE: Record<string, Tone> = { DRAFT: 'muted', SUBMITTED: 'info', WITHDRAWN: 'muted', APPROVED: 'ok', FUNDED: 'ok', HELD: 'warn', REJECTED: 'bad', SUSPENDED: 'bad', RELEASED: 'ok', SUPERSEDED: 'muted', IN_REVIEW: 'info', CHANGES_REQUESTED: 'warn', ALLOWED: 'ok', DENIED: 'bad', AUTHORIZED: 'ok' };
const tone = (s: string): Tone => TONE[s] || 'muted';
const when = (s: string | null | undefined) => (s ? s.slice(0, 16).replace('T', ' ') : '—');
const call = (op: string, args: Record<string, unknown>) => api.call(op as never, args as never) as Promise<unknown>;

// ------------------------------------------------------------------------------------------------------------ the request desk
export function Requests() {
  const { can } = useMe();
  const q = useQuery<{ items: RequestRow[] }>('requests', () => call('getV1Requests', {}) as Promise<{ items: RequestRow[] }>);
  const cat = useQuery<Catalogue>('projects:catalogue', () => call('getV1ProjectsCatalogue', {}) as Promise<Catalogue>);
  const [open, setOpen] = useState(false); const [wd, setWd] = useState<string | null>(null); const [why, setWhy] = useState('');
  const submit = useMutation((code: string) => call('postV1RequestsCodeSubmit', { params: { code } }), ['requests', 'projects']);
  const withdraw = useMutation((a: { code: string; reason: string }) => call('postV1RequestsCodeWithdraw', { params: { code: a.code }, body: { reason: a.reason } }), ['requests', 'projects']);
  const cols: Column<RequestRow>[] = [
    { key: 'c', header: 'Request', render: (r) => <div><b>{r.title}</b><div className="ui-meta mono">{r.code}{r.programme ? ' · programme' : ''}</div></div>, sort: (r) => r.code },
    { key: 't', header: 'Type', render: (r) => cat.data?.requestTypes.find((t) => t.key === r.type)?.label || r.type, sort: (r) => r.type },
    { key: 's', header: 'Site', render: (r) => r.site || '—' },
    { key: 'st', header: 'State', render: (r) => <Tag tone={tone(r.state)}>{r.state}</Tag>, sort: (r) => r.state },
    { key: 'p', header: 'Project', render: (r) => (r.project ? <a className="mono" href={href('projects', r.project)}>{r.project}</a> : <span className="ui-meta">not yet</span>) },
    { key: 'a', header: '', render: (r) => <span className="row-actions">{r.state === 'DRAFT' && can('request.submit') ? <Button small kind="primary" busy={submit.busy} onClick={() => submit.run(r.code)}>Submit</Button> : null}{r.state !== 'WITHDRAWN' && can('request.withdraw') ? <Button small kind="quiet" onClick={() => setWd(r.code)}>Withdraw</Button> : null}</span> },
  ];
  return (
    <section className="page">
      <header className="page__head"><div><h1>Requests</h1><p className="lede">Intake: what the business asks for, in one of nine kinds, with its intent, constraints, photos, plans and dimensions — each dimension says where it came from and how sure it is. A submitted request becomes a governed project.</p></div>
        {can('request.submit') ? <Button kind="primary" onClick={() => setOpen(true)}>New request</Button> : null}</header>
      <p className="subnav"><a href={href('projects')}>Projects</a> · <b>Requests</b></p>
      {submit.error ? <ErrorState error={submit.error} /> : null}{withdraw.error ? <ErrorState error={withdraw.error} /> : null}
      {q.error ? <ErrorState error={q.error} retry={q.reload} /> : !q.data ? <Loading /> : !q.data.items.length ? <Empty title="No requests">A requester sees their own requests; project roles see the organization's within their site scope.</Empty> : <DataTable rows={q.data.items} columns={cols} rowKey={(r) => r.code} caption="Requests" dense />}
      <NewRequest open={open} onClose={() => setOpen(false)} catalogue={cat.data || null} />
      <Drawer open={!!wd} title={`Withdraw ${wd || ''}`} onClose={() => setWd(null)} footer={<><Button onClick={() => setWd(null)}>Cancel</Button><Button kind="primary" busy={withdraw.busy} onClick={async () => { if ((await withdraw.run({ code: wd!, reason: why })) !== undefined) { setWd(null); setWhy(''); } }}>Withdraw</Button></>}>
        <Field label="Reason" hint="At least 8 characters; an approved or funded project is suspended by finance, not withdrawn here">{(id) => <textarea id={id} rows={2} value={why} onChange={(e) => setWhy(e.target.value)} />}</Field>{withdraw.error ? <ErrorState error={withdraw.error} /> : null}
      </Drawer>
    </section>
  );
}

function NewRequest({ open, onClose, catalogue }: { open: boolean; onClose: () => void; catalogue: Catalogue | null }) {
  const sites = useQuery<{ items: Array<{ code: string; name: string; buildings: Array<{ code: string; name: string }> }> }>(open ? 'sites' : null, () => call('getV1Sites', {}) as never);
  const [f, setF] = useState({ type: 'new_room', title: '', intent: '', constraints: '', siteCode: '', buildingCode: '', roomCode: '', provisionalRoom: '', archetype: '', capacity: '', photoPolicy: 'DOCUMENTATION_REQUIRED', photos: '', plans: '', programme: false, vendorEmail: '' });
  const [dims, setDims] = useState<Dim[]>([]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const mk = useMutation(() => call('postV1Requests', { idempotencyKey: newKey(), body: { type: f.type, title: f.title, intent: f.intent, constraints: f.constraints || undefined, siteCode: f.siteCode || sites.data?.items[0]?.code, buildingCode: f.buildingCode || undefined, roomCode: f.roomCode || undefined, provisionalRoom: f.provisionalRoom || undefined, archetype: f.archetype || undefined, capacity: f.capacity ? Number(f.capacity) : undefined, photoPolicy: f.photoPolicy, photos: f.photos.split(',').map((x) => x.trim()).filter(Boolean).map((name) => ({ name })), plans: f.plans.split(',').map((x) => x.trim()).filter(Boolean).map((name) => ({ name })), dimensions: dims.filter((d) => d.value).map((d) => ({ ...d, value: Number(d.value) })), programme: f.programme, vendorEmail: f.vendorEmail || null } }), ['requests']);
  const t = catalogue?.requestTypes.find((x) => x.key === f.type);
  return (
    <Drawer open={open} title="New request" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button kind="primary" busy={mk.busy} onClick={async () => { if ((await mk.run(undefined)) !== undefined) onClose(); }}>Save as draft</Button></>}>
      <Field label="Kind of request" hint={t ? `${t.summary} (source: ${t.source})` : undefined}>{(id) => <select id={id} value={f.type} onChange={set('type')}>{(catalogue?.requestTypes || []).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select>}</Field>
      <Field label="Title">{(id) => <input id={id} value={f.title} onChange={set('title')} maxLength={160} />}</Field>
      <Field label="Usage intent" hint="What should the room do for the people in it? Required by the governance guard.">{(id) => <textarea id={id} rows={3} value={f.intent} onChange={set('intent')} />}</Field>
      <Field label="Constraints and operational needs">{(id) => <textarea id={id} rows={2} value={f.constraints} onChange={set('constraints')} />}</Field>
      <Field label="Site">{(id) => <select id={id} value={f.siteCode} onChange={set('siteCode')}>{(sites.data?.items || []).map((s) => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}</select>}</Field>
      <Field label="Building">{(id) => <select id={id} value={f.buildingCode} onChange={set('buildingCode')}><option value="">—</option>{(sites.data?.items || []).filter((s) => !f.siteCode || s.code === f.siteCode).flatMap((s) => s.buildings).map((b) => <option key={b.code} value={b.code}>{b.name} ({b.code})</option>)}</select>}</Field>
      <Field label="Existing room code" hint="Leave empty for a room that does not exist yet">{(id) => <input id={id} value={f.roomCode} onChange={set('roomCode')} maxLength={40} placeholder="R-…" />}</Field>
      <Field label="Provisional room name" hint="Only if the room is not built yet; reconciled when it is">{(id) => <input id={id} value={f.provisionalRoom} onChange={set('provisionalRoom')} maxLength={120} />}</Field>
      <div className="two"><Field label="Room type">{(id) => <input id={id} value={f.archetype} onChange={set('archetype')} maxLength={40} placeholder="e.g. HUD, COL, BRD" />}</Field><Field label="Capacity (people)">{(id) => <input id={id} type="number" min={1} value={f.capacity} onChange={set('capacity')} />}</Field></div>
      <Field label="Photo policy" hint="LOCATION_VERIFICATION_REQUIRED makes photos a hard requirement at submission">{(id) => <select id={id} value={f.photoPolicy} onChange={set('photoPolicy')}>{['DOCUMENTATION_REQUIRED', 'LOCATION_VERIFICATION_REQUIRED', 'NOT_REQUIRED'].map((x) => <option key={x}>{x}</option>)}</select>}</Field>
      <Field label="Photos (file names, comma-separated)" hint="References only; the images themselves travel as evidence objects">{(id) => <input id={id} value={f.photos} onChange={set('photos')} />}</Field>
      <Field label="Plans (file names, comma-separated)">{(id) => <input id={id} value={f.plans} onChange={set('plans')} />}</Field>
      <fieldset className="dims"><legend>Dimensions with provenance</legend>
        {dims.map((d, i) => <div key={i} className="dims__row"><input aria-label="Dimension" value={d.name} onChange={(e) => setDims(dims.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="length" /><input aria-label="Value" type="number" step="0.01" value={d.value} onChange={(e) => setDims(dims.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} /><input aria-label="Unit" value={d.unit} onChange={(e) => setDims(dims.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))} placeholder="m" /><select aria-label="Source" value={d.source} onChange={(e) => setDims(dims.map((x, j) => (j === i ? { ...x, source: e.target.value } : x)))}>{['MANUALLY_PROPOSED', 'FROM_PLAN', 'SURVEY_MEASURED', 'LITE_MODEL'].map((x) => <option key={x}>{x}</option>)}</select><input aria-label="Uncertainty" value={d.uncertainty} onChange={(e) => setDims(dims.map((x, j) => (j === i ? { ...x, uncertainty: e.target.value } : x)))} placeholder="±0.2 m" /></div>)}
        <Button small onClick={() => setDims([...dims, { name: dims.length === 0 ? 'length' : dims.length === 1 ? 'width' : 'height', value: '', unit: 'm', source: 'MANUALLY_PROPOSED', uncertainty: 'unknown' }])}>Add a dimension</Button>
        <p className="ui-meta">Missing plans or dimensions open survey tasks instead of guesses.</p>
      </fieldset>
      <Field label="Supplier contact email" hint="Leave empty for an internal route (needs a documented exception at review)">{(id) => <input id={id} value={f.vendorEmail} onChange={set('vendorEmail')} maxLength={200} />}</Field>
      <label className="check"><input type="checkbox" checked={f.programme} onChange={(e) => setF((x) => ({ ...x, programme: e.target.checked }))} /> Programme: a change applied across many rooms, one room at a time</label>
      {mk.error ? <ErrorState error={mk.error} /> : null}
    </Drawer>
  );
}

// ------------------------------------------------------------------------------------------------------------ the project record
export function ProjectRecord({ code }: { code: string }) {
  const { can } = useMe();
  const q = useQuery<Project>(`project:${code}`, () => call('getV1ProjectsCode', { params: { code } }) as Promise<Project>);
  const [drawer, setDrawer] = useState<string | null>(null);
  const keys = [`project:${code}`, 'projects', 'requests'];
  const act = useMutation((a: { op: string; args: Record<string, unknown> }) => call(a.op, a.args), keys);
  if (q.error) return <section className="page"><ErrorState error={q.error} retry={q.reload} /></section>;
  if (!q.data) return <section className="page"><Loading label="Reading the project" /></section>;
  const p = q.data; const r = p.request;
  const run = async (op: string, args: Record<string, unknown>): Promise<boolean> => { const ok = (await act.run({ op, args })) !== undefined; if (ok) setDrawer(null); return ok; };
  const P = (body: Record<string, unknown>) => ({ params: { code }, body });
  const gov = (to: string) => p.next.governance.find((s) => s.to === to);
  const del = (to: string) => p.next.delivery.find((s) => s.to === to);
  const may = (s: Step | undefined) => !!s && can(s.authority);
  return (
    <section className="page">
      <header className="page__head"><div><p className="kicker"><a href={href('projects')}>Projects</a> · {p.type ? p.type.replace(/_/g, ' ') : 'project'}</p><h1>{p.name}</h1><p className="ui-meta mono">{p.code}{r ? ` · from ${r.code}` : ''} · scope revision {p.scopeRev}{p.internalOnly ? ' · internal route' : ''}</p></div>
        <div className="stack"><Tag tone={tone(p.governance)}>{p.governance}</Tag>{p.delivery ? <Tag tone={tone(p.delivery)}>{p.delivery}</Tag> : null}</div></header>
      <ol className="stages" aria-label="Lifecycle stage" data-testid="stages">{STAGES.map((s, i) => <li key={s} className={i + 1 < p.stage.n ? 'done' : i + 1 === p.stage.n ? 'now' : ''}><span className="stages__n">{i + 1}</span>{s}</li>)}</ol>
      {act.error ? <ErrorState error={act.error} /> : null}

      <section className="card stack" data-testid="next-steps"><h2 className="h3">Next governed steps</h2>
        {p.state === 'CLOSED' ? <Notice tone="ok">The project is closed: every room is accepted against a current baseline and handed to <b>{p.supportOwner}</b>. Live health stays NOT_MONITORED until monitoring evidence exists.</Notice> : null}
        <ul className="steps">
          {p.next.governance.map((s) => <li key={s.to}><b>{p.governance} → {s.to}</b> <span className="ui-meta">{s.authority} · guard {s.guard}</span>{may(s) ? <span className="row-actions">{stepButton(s.to, setDrawer, run, P)}</span> : <span className="ui-meta"> · not your authority</span>}</li>)}
          {p.next.delivery.map((s) => <li key={s.to}><b>{p.delivery} → {s.to}</b> <span className="ui-meta">{s.authority} · guard {s.guard}</span>{s.blockers?.length ? <ul className="why">{s.blockers.map((b) => <li key={b}>{b}</li>)}</ul> : <span className="ui-meta ok"> · open</span>}{may(s) && !s.blockers?.length ? <span className="row-actions">{deliveryButton(s.to, setDrawer, run, P)}</span> : null}</li>)}
          {!p.next.governance.length && !p.next.delivery.length && p.state !== 'CLOSED' ? <li className="ui-meta">No governed step from {p.governance}{p.delivery ? ` / ${p.delivery}` : ''}{['HELD', 'REJECTED', 'SUSPENDED'].includes(p.governance) ? ' — a scope revision (scope.revise) reopens the project with a new brief and a new approval chain' : ''}.</li> : null}
          {['HELD', 'REJECTED', 'SUSPENDED'].includes(p.governance) && can('scope.revise') ? <li><Button small onClick={() => setDrawer('scope')}>Revise the scope (reopen)</Button></li> : null}
          {p.delivery && ['DESIGN_DRAFT', 'DESIGN_REVIEW'].includes(p.delivery) && can(['design.submit', 'design.revise']) ? <li><Button small onClick={() => setDrawer('revision')}>Propose a design revision</Button></li> : null}
        </ul>
      </section>

      {r ? <section className="card stack"><h2 className="h3">Request</h2>
        <Facts items={[['Requester', r.requester], ['Submitted', when(r.submittedAt)], ['Where', [r.site, r.building, r.room || r.provisionalRoom].filter(Boolean).join(' · ') || '—'], ['Room type · capacity', `${r.archetype || '—'} · ${r.capacity ?? '—'}`], ['Photo policy', `${r.photoPolicy} · ${r.photos.length} photo(s) · ${r.plans.length} plan(s)`], ['Programme', r.programme ? 'yes' : 'no']]} />
        <p><b>Intent.</b> {r.intent}</p>{r.constraints ? <p><b>Constraints.</b> {r.constraints}</p> : null}
        {r.dimensions.length ? <ul className="plain">{r.dimensions.map((d) => <li key={d.name}><b>{d.name}</b> {d.value} {d.unit} <Tag tone="muted">{d.source}</Tag> <span className="ui-meta">{d.uncertainty}</span></li>)}</ul> : <p className="ui-meta">No dimensions given — a survey task, not a guess.</p>}
        {p.exceptionReason ? <Notice tone="info"><b>Internal route.</b> {p.exceptionReason}</Notice> : null}
      </section> : null}

      <section className="card stack"><h2 className="h3">Engineering brief</h2>
        {!p.briefs.length ? <p className="ui-meta">No brief yet.</p> : p.briefs.map((b) => <article key={b.rev} className="rev"><header><b>Brief rev {b.rev}</b> <span className="ui-meta">scope revision {b.scopeRev} · {b.author} · {when(b.createdAt)}{b.scopeRev !== p.scopeRev ? ' · superseded by a scope revision' : ''}</span></header><p>{b.content.summary}</p><ul className="plain">{b.content.requirements.map((x) => <li key={x}>{x}</li>)}</ul>{b.content.romUsd != null ? <p className="ui-meta">ROM {b.content.romUsd.toLocaleString()} USD — {b.content.romLabel}</p> : null}</article>)}
      </section>

      <section className="card stack"><h2 className="h3">Approval and funding</h2>
        <Facts items={[['Selected approver', p.approver || '—'], ['Decisions', String(p.decisions.length)], ['Funding', p.funding.filter((f) => f.kind === 'AUTHORIZED').length ? `${p.funding.filter((f) => f.kind === 'AUTHORIZED').slice(-1)[0]!.amount} ${p.funding.filter((f) => f.kind === 'AUTHORIZED').slice(-1)[0]!.currency}` : 'none']]} />
        {p.decisions.length ? <ul className="plain">{p.decisions.map((d, i) => <li key={i}><Tag tone={tone(d.decision)}>{d.decision}</Tag> scope revision {d.scopeRev} by {d.decidedBy}{d.delegated ? <Tag tone="info">delegated</Tag> : null} <span className="ui-meta">{when(d.decidedAt)}</span>{d.reason ? <div className="ui-meta">{d.reason}{d.reviewDate ? ` · review ${d.reviewDate}` : ''}</div> : null}</li>)}</ul> : null}
        {p.funding.length ? <ul className="plain">{p.funding.map((f, i) => <li key={i}><Tag tone={tone(f.kind)}>{f.kind}</Tag> {f.amount} {f.currency} · {f.costCenter} · scope revision {f.scopeRev} · {f.recordedBy} <span className="ui-meta">{when(f.recordedAt)}{f.reason ? ` · ${f.reason}` : ''}</span></li>)}</ul> : null}
      </section>

      <section className="card stack" data-testid="design"><h2 className="h3">Collaborative design</h2>
        {!p.design.length ? <p className="ui-meta">No design revision yet{p.delivery ? '' : ' — design starts once the project is funded'}.</p> : p.design.map((d) => <article key={d.rev} className="rev"><header><b>Revision {d.rev}</b> <Tag tone={tone(d.state)}>{d.state}</Tag> <span className="ui-meta">{d.author} · {when(d.createdAt)} · {d.reason}</span></header>
          <Facts items={[['Files', d.files.length ? d.files.map((f) => f.name).join(', ') : 'none'], ['Lite model', d.liteModelRoom ? <a className="mono" href={href('rooms', d.liteModelRoom)}>{d.liteModelRoom}</a> : 'none'], ['DIVR', d.divr ? `${d.divr.intent} · ${d.divr.verificationPlan.length} verification step(s)` : 'none'], ['Reviews needed', d.domainsNeeded.join(', ') || 'none']]} />
          {d.reviews.length ? <ul className="plain">{d.reviews.map((x, i) => <li key={i}><Tag tone={tone(x.decision)}>{x.decision}</Tag> {x.domain} by {x.reviewedBy} <span className="ui-meta">{when(x.reviewedAt)}{x.note ? ` · ${x.note}` : ''}</span></li>)}</ul> : null}
          {d.rfis.length ? <ul className="plain">{d.rfis.map((x) => <li key={x.code}><b className="mono">{x.code}</b> {x.question} <span className="ui-meta">— {x.raisedBy}</span>{x.answer ? <div><Tag tone="ok">RESOLVED</Tag> {x.answer} <span className="ui-meta">— {x.resolvedBy}</span></div> : <div><Tag tone="warn">OPEN</Tag>{can('rfi.resolve') ? <Button small kind="quiet" onClick={() => setDrawer(`rfi:${x.code}`)}>Resolve</Button> : null}</div>}</li>)}</ul> : null}
          {d.state === 'IN_REVIEW' ? <span className="row-actions">{(['dsp', 'camera', 'touch'] as const).filter((dom) => d.domainsNeeded.includes(dom) && can(`review.${dom}`)).map((dom) => <Button key={dom} small onClick={() => setDrawer(`review:${d.rev}:${dom}`)}>Review {dom}</Button>)}{can(['design.submit', 'design.revise', 'review.dsp', 'review.camera', 'review.touch', 'design.release', 'brief.approve']) ? <Button small kind="quiet" onClick={() => setDrawer(`raise:${d.rev}`)}>Raise an RFI</Button> : null}</span> : null}
        </article>)}
      </section>

      <section className="card stack" data-testid="rooms"><h2 className="h3">Rooms and execution facts</h2>
        {!p.rooms.length ? <p className="ui-meta">No room in this project yet. An executive puts a room into a project from the room's page.</p> : <DataTable rows={p.rooms} rowKey={(x) => x.code} caption="Rooms" dense columns={[
          { key: 'c', header: 'Room', render: (x) => <a className="mono" href={href('rooms', x.code, 'commissioning')}>{x.code}</a> },
          { key: 'l', header: 'Lifecycle', render: (x) => <Tag tone="info">{x.lifecycle}</Tag> },
          { key: 'p', header: 'Plan', render: (x) => (x.hasPlan ? 'compiled' : '—') },
          { key: 'v', header: 'Verified', render: (x) => `${x.verified} / ${x.applicable}` },
          { key: 'i', header: 'Open deficiencies', render: (x) => String(x.openIssues) },
          { key: 'd', header: 'Documents', render: (x) => `${x.drawingsApproved ? 'drawings approved' : 'drawings pending'} · ${x.photosApproved ? 'photos signed off' : 'photos pending'}` },
          { key: 'b', header: 'Baseline', render: (x) => (x.hasBaseline ? <Tag tone="ok">CURRENT</Tag> : <span className="ui-meta">none</span>) },
        ]} />}
        <Facts items={[['Rule pack', p.rulePackVersion || '—'], ['Field authorization', p.fieldAuthorization ? `qualified ${String(p.fieldAuthorization['technicianQualified'])} · site access ${String(p.fieldAuthorization['siteAccess'])} · attested (no staff skills registry yet)${p.fieldAuthorization['workOrderAccepted'] ? ' · work order accepted' : ''}` : '—'], ['QA sign-off', p.qaSignoffBy || '—'], ['Support owner', p.supportOwner || '—']]} />
      </section>

      <details className="card"><summary>Audit trail ({p.audit.length})</summary><ul className="plain">{p.audit.map((e, i) => <li key={i}><Tag tone={tone(e.outcome)}>{e.outcome}</Tag> {e.action} <span className="ui-meta">{e.by} · {when(e.at)}</span>{Array.isArray((e.detail as { why?: unknown }).why) ? <ul className="why">{((e.detail as { why: string[] }).why).map((w) => <li key={w}>{w}</li>)}</ul> : null}</li>)}</ul></details>

      <ActionDrawer id={drawer} onClose={() => setDrawer(null)} run={run} P={P} busy={act.busy} error={act.error} scopeRev={p.scopeRev} rooms={p.rooms.map((x) => x.code)} />
    </section>
  );
}

function stepButton(to: string, open: (k: string) => void, run: (op: string, a: Record<string, unknown>) => Promise<boolean>, P: (b: Record<string, unknown>) => Record<string, unknown>) {
  const map: Record<string, [string, string]> = { VENDOR_ACKNOWLEDGED: ['Acknowledge as supplier', 'vendor'], INTERNAL_ROUTE_RECORDED: ['Route internally', 'internal'], PITCH_READY: ['Write the brief', 'brief'], DECISION_PENDING: ['Select the approver', 'approver'], APPROVED: ['Decide', 'decision'], HELD: ['Decide', 'decision'], REJECTED: ['Decide', 'decision'], FUNDED: ['Authorize funding', 'funding'], SUSPENDED: ['Withdraw funding', 'suspend'] };
  const m = map[to]; if (!m) return null;
  if (m[1] === 'vendor') return <Button small kind="primary" onClick={() => run('postV1ProjectsCodeRoute', P({ route: 'vendor' }))}>{m[0]}</Button>;
  if (m[1] === 'decision' && to !== 'APPROVED') return null;   // one "Decide" button opens the drawer for all three outcomes
  return <Button small kind="primary" onClick={() => open(m[1])}>{m[0]}</Button>;
}
function deliveryButton(to: string, open: (k: string) => void, run: (op: string, a: Record<string, unknown>) => Promise<boolean>, P: (b: Record<string, unknown>) => Record<string, unknown>) {
  const needs: Record<string, string> = { FIELD_AUTHORIZED: 'field', DOCUMENTS_APPROVED: 'documents', HANDED_OFF: 'handoff' };
  if (needs[to]) return <Button small kind="primary" onClick={() => open(needs[to]!)}>Move to {to}</Button>;
  return <Button small kind="primary" onClick={() => run('postV1ProjectsCodeDelivery', P({ to }))}>Move to {to}</Button>;
}

function ActionDrawer({ id, onClose, run, P, busy, error, scopeRev, rooms }: { id: string | null; onClose: () => void; run: (op: string, a: Record<string, unknown>) => Promise<boolean>; P: (b: Record<string, unknown>) => Record<string, unknown>; busy: boolean; error: unknown; scopeRev: number; rooms: string[] }) {
  const [f, setF] = useState<Record<string, string>>({});
  const v = (k: string, d = '') => f[k] ?? d; const set = (k: string) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const close = () => { setF({}); onClose(); };
  const foot = (label: string, go: () => Promise<boolean>) => <><Button onClick={close}>Cancel</Button><Button kind="primary" busy={busy} onClick={async () => { if (await go()) setF({}); }}>{label}</Button></>;
  const err = error ? <ErrorState error={error as never} /> : null;
  const [kind, a, b] = (id || '').split(':');
  const list = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
  switch (kind) {
    case 'internal': return <Drawer open title="Route internally" onClose={close} footer={foot('Record the route', () => run('postV1ProjectsCodeRoute', P({ route: 'internal', exceptionReason: v('reason') })))}><Field label="Documented exception" hint="Why no supplier is involved (more than 10 characters)">{(i) => <textarea id={i} rows={3} value={v('reason')} onChange={set('reason')} />}</Field>{err}</Drawer>;
    case 'brief': return <Drawer open title={`Engineering brief · scope revision ${scopeRev}`} onClose={close} footer={foot('Submit the brief', () => run('postV1ProjectsCodeBrief', P({ summary: v('summary'), requirements: list(v('req')), assumptions: list(v('ass')), romUsd: v('rom') ? Number(v('rom')) : undefined, comparableRooms: v('cmp').split(',').map((x) => x.trim()).filter(Boolean) })))}>
      <Field label="Summary">{(i) => <textarea id={i} rows={3} value={v('summary')} onChange={set('summary')} />}</Field><Field label="Requirements (one per line)">{(i) => <textarea id={i} rows={4} value={v('req')} onChange={set('req')} />}</Field><Field label="Assumptions (one per line)">{(i) => <textarea id={i} rows={2} value={v('ass')} onChange={set('ass')} />}</Field>
      <Field label="Initial ROM (USD)" hint="Before design, at standard models — never a quote">{(i) => <input id={i} type="number" min={0} value={v('rom')} onChange={set('rom')} />}</Field><Field label="Comparable rooms (codes, comma-separated)">{(i) => <input id={i} value={v('cmp')} onChange={set('cmp')} />}</Field>{err}</Drawer>;
    case 'approver': return <Drawer open title="Select the approver" onClose={close} footer={foot('Request the decision', () => run('postV1ProjectsCodeApprover', P({ approverEmail: v('email') })))}><Field label="Approver's email" hint="Must hold project.decide; not the brief's author; not yourself">{(i) => <input id={i} value={v('email')} onChange={set('email')} />}</Field>{err}</Drawer>;
    case 'decision': return <Drawer open title={`Decide scope revision ${scopeRev}`} onClose={close} footer={foot('Record the decision', () => run('postV1ProjectsCodeDecision', P({ decision: v('decision', 'APPROVED'), scopeRev, reason: v('reason') || undefined, reviewDate: v('review') || undefined })))}>
      <Field label="Decision">{(i) => <select id={i} value={v('decision', 'APPROVED')} onChange={set('decision')}>{['APPROVED', 'HELD', 'REJECTED'].map((x) => <option key={x}>{x}</option>)}</select>}</Field><Field label="Reason" hint="Required for a hold or a rejection (at least 8 characters)">{(i) => <textarea id={i} rows={2} value={v('reason')} onChange={set('reason')} />}</Field><Field label="Review date (hold)">{(i) => <input id={i} type="date" value={v('review')} onChange={set('review')} />}</Field>{err}</Drawer>;
    case 'funding': return <Drawer open title={`Authorize funding · scope revision ${scopeRev}`} onClose={close} footer={foot('Authorize', () => run('postV1ProjectsCodeFunding', P({ amount: Number(v('amount')), currency: v('currency', 'USD'), costCenter: v('cc'), scopeRev })))}>
      <div className="two"><Field label="Amount">{(i) => <input id={i} type="number" min={0} value={v('amount')} onChange={set('amount')} />}</Field><Field label="Currency">{(i) => <input id={i} value={v('currency', 'USD')} onChange={set('currency')} maxLength={3} />}</Field></div><Field label="Cost center">{(i) => <input id={i} value={v('cc')} onChange={set('cc')} />}</Field>{err}</Drawer>;
    case 'suspend': return <Drawer open title="Withdraw funding" onClose={close} footer={foot('Withdraw', () => run('postV1ProjectsCodeFundingWithdraw', P({ reason: v('reason') })))}><Field label="Reason">{(i) => <textarea id={i} rows={2} value={v('reason')} onChange={set('reason')} />}</Field>{err}</Drawer>;
    case 'scope': return <Drawer open title={`Revise the scope (to revision ${scopeRev + 1})`} onClose={close} footer={foot('Reopen with a new scope revision', () => run('postV1ProjectsCodeScope', P({ reason: v('reason') })))}><Notice tone="info">The project returns to its recorded route for a new brief and a new approval chain. Earlier briefs and decisions stay in the record.</Notice><Field label="Reason">{(i) => <textarea id={i} rows={2} value={v('reason')} onChange={set('reason')} />}</Field>{err}</Drawer>;
    case 'revision': return <Drawer open title="Propose a design revision" onClose={close} footer={foot('Propose', () => run('postV1ProjectsCodeDesignRevisions', P({ reason: v('reason'), files: v('files').split(',').map((x) => x.trim()).filter(Boolean).map((name) => ({ name })), liteModelRoom: v('room') || undefined, divr: v('intent') ? { intent: v('intent'), verificationPlan: list(v('plan')) } : undefined, domainsNeeded: ['dsp', 'camera', 'touch'].filter((d) => v(`d:${d}`) === 'on') })))}>
      <Field label="Reason for this revision">{(i) => <input id={i} value={v('reason')} onChange={set('reason')} />}</Field><Field label="Design files (names, comma-separated)">{(i) => <input id={i} value={v('files')} onChange={set('files')} />}</Field>
      <Field label="Lite model (a room of this project)">{(i) => <select id={i} value={v('room')} onChange={set('room')}><option value="">none</option>{rooms.map((x) => <option key={x}>{x}</option>)}</select>}</Field>
      <Field label="Design intent (DIVR)">{(i) => <textarea id={i} rows={2} value={v('intent')} onChange={set('intent')} />}</Field><Field label="Verification plan (one per line)">{(i) => <textarea id={i} rows={2} value={v('plan')} onChange={set('plan')} />}</Field>
      <fieldset className="dims"><legend>Domain reviews needed</legend>{['dsp', 'camera', 'touch'].map((d) => <label key={d} className="check"><input type="checkbox" checked={v(`d:${d}`) === 'on'} onChange={(e) => setF((x) => ({ ...x, [`d:${d}`]: e.target.checked ? 'on' : '' }))} /> {d}</label>)}</fieldset>{err}</Drawer>;
    case 'review': return <Drawer open title={`Review ${b} · revision ${a}`} onClose={close} footer={foot('Record the review', () => run('postV1ProjectsCodeDesignRevisionsRevReview', { params: { code: (P({}) as { params: { code: string } }).params.code, rev: a }, body: { domain: b, decision: v('decision', 'APPROVED'), note: v('note') || undefined } }))}><Field label="Decision">{(i) => <select id={i} value={v('decision', 'APPROVED')} onChange={set('decision')}>{['APPROVED', 'CHANGES_REQUESTED'].map((x) => <option key={x}>{x}</option>)}</select>}</Field><Field label="Note">{(i) => <textarea id={i} rows={2} value={v('note')} onChange={set('note')} />}</Field>{err}</Drawer>;
    case 'raise': return <Drawer open title={`Raise an RFI on revision ${a}`} onClose={close} footer={foot('Raise', () => run('postV1ProjectsCodeDesignRevisionsRevRfis', { params: { code: (P({}) as { params: { code: string } }).params.code, rev: a }, body: { question: v('q') } }))}><Field label="Question">{(i) => <textarea id={i} rows={3} value={v('q')} onChange={set('q')} />}</Field>{err}</Drawer>;
    case 'rfi': return <Drawer open title={`Resolve ${a}`} onClose={close} footer={foot('Resolve', () => run('postV1ProjectsCodeRfisRfiResolve', { params: { code: (P({}) as { params: { code: string } }).params.code, rfi: a }, body: { answer: v('answer') } }))}><Field label="Answer">{(i) => <textarea id={i} rows={3} value={v('answer')} onChange={set('answer')} />}</Field>{err}</Drawer>;
    case 'field': return <Drawer open title="Authorize field work" onClose={close} footer={foot('Authorize', () => run('postV1ProjectsCodeDelivery', P({ to: 'FIELD_AUTHORIZED', technicianEmail: v('tech'), technicianQualified: v('q') === 'on', siteAccess: v('s') === 'on' })))}><Field label="Technician's email" hint="A field technician or installer of this organization">{(i) => <input id={i} value={v('tech')} onChange={set('tech')} />}</Field><label className="check"><input type="checkbox" checked={v('q') === 'on'} onChange={(e) => setF((x) => ({ ...x, q: e.target.checked ? 'on' : '' }))} /> Meets the work needs (certifications, experience, licences) — your attestation; there is no staff skills registry yet</label><label className="check"><input type="checkbox" checked={v('s') === 'on'} onChange={(e) => setF((x) => ({ ...x, s: e.target.checked ? 'on' : '' }))} /> Site access confirmed</label>{err}</Drawer>;
    case 'documents': return <Drawer open title="Approve documents and photos" onClose={close} footer={foot('Approve', () => run('postV1ProjectsCodeDelivery', P({ to: 'DOCUMENTS_APPROVED', photosApproved: v('p') === 'on' })))}><Notice tone="info">Drawings are approved on each room's page; this records the QA sign-off of the final photos.</Notice><label className="check"><input type="checkbox" checked={v('p') === 'on'} onChange={(e) => setF((x) => ({ ...x, p: e.target.checked ? 'on' : '' }))} /> Final photos reviewed and approved</label>{err}</Drawer>;
    case 'handoff': return <Drawer open title="Hand off to operations" onClose={close} footer={foot('Hand off', () => run('postV1ProjectsCodeDelivery', P({ to: 'HANDED_OFF', supportOwnerEmail: v('owner') })))}><Field label="Support owner's email">{(i) => <input id={i} value={v('owner')} onChange={set('owner')} />}</Field>{err}</Drawer>;
    default: return null;
  }
}
