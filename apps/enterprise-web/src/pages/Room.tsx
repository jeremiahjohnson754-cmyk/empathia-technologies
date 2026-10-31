/**
 * The room workspace: the vertical slice in one place. Design (devices, revisions, drawings, classification) → lifecycle steps →
 * commissioning (results with stored evidence, independent verification) → issues and work orders → the operational read model.
 * Buttons appear for roles that hold the authority, as a convenience; the API decides and its refusals are shown verbatim.
 */
import { useState } from 'react';
import { Button, Composition, DataTable, Drawer, Empty, ErrorState, Facts, Field, Loading, Notice, StatusBadge, Tabs, Tag, LIFECYCLE, LIVE, RESULT, SEVERITY, type Column } from '@empathia/ui';
import type { Device, Issue, PlanRow, RoomDetail, Lifecycle } from '@empathia/api-client';
import { api, newKey, useMutation, useQuery, invalidate } from '../api.js';
import { go } from '../router.js';
import { useMe } from '../me.js';
import { FloorPlan } from '../components/FloorPlan.js';
import { ReadinessStrip, AssuranceTab } from './Assurance.js';
import { RoomField } from './Field.js';

/** Display hint mirroring LIFECYCLE_AUTHORITY in packages/commissioning-engine/src/lifecycle.ts; the server enforces the real rule. */
const APEX_OPEN = ['service.triage', 'tests.verify.all', 'service.verify', 'baseline.approve', 'review.dsp', 'review.camera', 'review.touch', 'provenance.review'];   // who may open an APEX case (services/enterprise-api/src/domain/apex.ts)
const NEXT: Record<string, [Lifecycle, string] | undefined> = {
  PLANNED: ['DESIGN_APPROVED', 'room.design.approve'], DESIGN_APPROVED: ['INSTALLATION_PENDING', 'window.approve'], INSTALLATION_PENDING: ['INSTALLED_UNVERIFIED', 'work.evidence'],
  INSTALLED_UNVERIFIED: ['COMMISSIONING', 'plan.compile'], COMMISSIONING: ['ACCEPTED', 'customer.accept'], ACCEPTED: ['OPERATIONAL', 'handoff.accept'],
};
const CATEGORIES = ['display', 'ledwall', 'projector', 'camera', 'bar', 'micceil', 'mictable', 'micwireless', 'speaker', 'dsp', 'amp', 'compute', 'switch', 'control', 'touch', 'scheduler', 'switcher', 'encoder', 'rack', 'pdu', 'lighting', 'occsensor', 'iot', 'table', 'chairs', 'lectern'];

export function Room({ code, tab }: { code: string; tab: string }) {
  const { can } = useMe();
  const q = useQuery<RoomDetail>(`room:${code}`, () => api.call('getV1RoomsRoom', { params: { room: code } }));
  const step = useMutation((to: Lifecycle) => api.call('postV1RoomsRoomLifecycle', { params: { room: code }, body: { to } }), [`room:${code}`, `readiness:${code}`, `baselines:${code}`, 'rooms', 'read', 'report']);
  if (q.error) return <section className="page"><ErrorState error={q.error} retry={q.reload} /></section>;
  if (!q.data) return <section className="page"><Loading label={`Loading ${code}`} /></section>;
  const d = q.data; const r = d.room;
  const next = NEXT[r.lifecycle];
  const rows = d.commissioning?.rows || [];
  const openIssues = d.issues.filter((i) => i.state === 'OPEN');
  const tabs = [
    { key: 'overview', label: 'Overview' }, { key: 'devices', label: 'Devices', count: d.devices.filter((x) => !x.furniture).length },
    { key: 'issues', label: 'Issues', count: openIssues.length }, { key: 'commissioning', label: 'Commissioning', count: rows.filter((x) => x.applicable).length },
    { key: 'drawings', label: 'Drawings & revisions', count: d.revisions.length }, { key: 'assurance', label: 'Acceptance & assurance' }, { key: 'service', label: 'Service & read model' }, { key: 'field', label: 'Field Intelligence' },
  ];
  return (
    <section className="page">
      <nav className="crumbs" aria-label="Breadcrumb"><a href="#/rooms">Rooms</a> / <span className="mono">{r.code}</span></nav>
      <header className="page__head">
        <div>
          <h1>{r.name}</h1>
          <p className="facts-inline"><span className="mono">{r.code}</span><StatusBadge table={LIFECYCLE} value={r.lifecycle} /><StatusBadge table={LIVE} value="NOT_MONITORED" /><span className="ui-meta">rev {r.rev}{r.approvedRevision ? ` · approved revision ${r.approvedRevision}` : ''}</span></p>
        </div>
        {next && can(next[1]) ? <Button kind="primary" busy={step.busy} onClick={() => void step.run(next[0])} testId="lifecycle-next">Move to {LIFECYCLE[next[0]]!.label.toLowerCase()}</Button> : null}
      </header>
      {step.error ? <ErrorState error={step.error} /> : null}
      <ReadinessStrip code={code} />
      <Tabs label="Room sections" tabs={tabs} active={tab} onChange={(k) => go('rooms', code, k)} />
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="panel">
        {tab === 'overview' ? <Overview d={d} /> : null}
        {tab === 'devices' ? <Devices d={d} /> : null}
        {tab === 'issues' ? <Issues d={d} /> : null}
        {tab === 'commissioning' ? <Commissioning d={d} /> : null}
        {tab === 'drawings' ? <Drawings d={d} /> : null}
        {tab === 'assurance' ? <AssuranceTab code={code} lifecycle={r.lifecycle} /> : null}
        {tab === 'service' ? <Service code={code} /> : null}
        {tab === 'field' ? <RoomField code={code} archetype={String(((d.room as { approvedClassification?: { archetype?: string } | null }).approvedClassification?.archetype) || d.room.classification?.archetype || 'HUD')} /> : null}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ overview
function Overview({ d }: { d: RoomDetail }) {
  const { can } = useMe();
  const r = d.room; const g = r.geometry; const c = r.classification as { archetype?: string; archetypeName?: string; why?: string[] } | null;
  const approved = (r as unknown as { approvedClassification?: { archetypeName?: string; override?: boolean; reason?: string; stale?: boolean } | null }).approvedClassification;
  const [override, setOverride] = useState(false); const [arch, setArch] = useState(''); const [reason, setReason] = useState('');
  const approve = useMutation(() => api.call('postV1RoomsRoomClassificationApprove', { params: { room: r.code }, body: override ? { archetype: arch, reason } : {} }), [`room:${r.code}`]);
  return (
    <div className="split">
      <div className="stack">
        <Facts items={[
          ['Template', r.template.replace(/_/g, ' ')], ['Intended use', r.intendedUse], ['People', r.occupancy],
          ['Size', `${g.lengthM?.toFixed?.(1)} × ${g.widthM?.toFixed?.(1)} m`], ['Ceiling', `${g.ceiling} m`], ['Outline', g.shape],
          ['Suggested type', c?.archetypeName || '—'], ['Approved type', approved ? `${approved.archetypeName}${approved.override ? ' (override)' : ''}${approved.stale ? ' — stale, re-approve' : ''}` : <span className="ui-muted">not approved</span>],
          ['Applicable tests', d.commissioning ? `${d.commissioning.applicable} of ${d.commissioning.library}` : '—'],
        ]} />
        {c?.why?.length ? <div><h2 className="h3">Why this type</h2><ul className="why">{c.why.map((w, i) => <li key={i}>{w}</li>)}</ul></div> : null}
        {can('room.classify.approve') && r.lifecycle === 'PLANNED' ? (
          <div className="card stack">
            <h2 className="h3">Engineer approval of the room type</h2>
            <label className="check"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} /> Override the suggestion</label>
            {override ? <div className="row2"><Field label="Archetype code">{(id) => <input id={id} value={arch} onChange={(e) => setArch(e.target.value.toUpperCase())} maxLength={8} placeholder="BRD" />}</Field>
              <Field label="Reason" hint="At least 10 characters; it is kept with the approval.">{(id, h) => <input id={id} aria-describedby={h} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={400} />}</Field></div> : null}
            <div><Button kind="primary" busy={approve.busy} onClick={() => void approve.run(undefined)} testId="approve-classification">{override ? 'Approve override' : `Approve ${c?.archetypeName || 'suggestion'}`}</Button></div>
            {approve.error ? <ErrorState error={approve.error} /> : null}
          </div>) : null}
      </div>
      <FloorPlan points={g.points} devices={d.devices} label={`Plan of ${r.name}`} />
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ devices
function Devices({ d }: { d: RoomDetail }) {
  const { can } = useMe();
  const code = d.room.code; const editable = can('room.design') && d.room.lifecycle === 'PLANNED';
  const [cat, setCat] = useState('display'); const [swap, setSwap] = useState<Device | null>(null); const [model, setModel] = useState('');
  const add = useMutation(() => api.call('postV1RoomsRoomDevices', { params: { room: code }, idempotencyKey: newKey(), body: { category: cat } }), [`room:${code}`]);
  const remove = useMutation((asset: string) => api.call('deleteV1RoomsRoomDevicesAsset', { params: { room: code, asset } }), [`room:${code}`]);
  const change = useMutation(() => api.call('patchV1RoomsRoomDevicesAsset', { params: { room: code, asset: swap!.id }, body: { model } }), [`room:${code}`]);
  const dropConn = useMutation((connection: string) => api.call('deleteV1RoomsRoomConnectionsConnection', { params: { room: code, connection } }), [`room:${code}`]);
  const cols: Column<Device>[] = [
    { key: 'id', header: 'Asset', render: (x) => <span className="mono">{x.id}</span>, sort: (x) => x.id, width: '110px' },
    { key: 'label', header: 'Device', render: (x) => x.label, sort: (x) => x.label },
    { key: 'cat', header: 'Category', render: (x) => <Tag>{x.cat}</Tag>, sort: (x) => x.cat },
    { key: 'model', header: 'Model', render: (x) => x.generic ? <span className="ui-muted">generic {x.model}</span> : x.model },
    { key: 'mount', header: 'Mount', render: (x) => x.mount },
    { key: 'pos', header: 'x, y (m)', render: (x) => `${x.x.toFixed(1)}, ${x.y.toFixed(1)}`, align: 'right' },
    { key: 'life', header: 'State', render: (x) => <span className="ui-meta">{x.lifecycle}</span> },
    ...(editable ? [{ key: 'act', header: '', render: (x: Device) => <span className="acts"><Button small kind="quiet" onClick={() => { setSwap(x); setModel(x.model); }}>Change model</Button><Button small kind="danger" onClick={() => void remove.run(x.id)}>Remove</Button></span> }] : []),
  ];
  return (
    <div className="stack">
      {editable ? <div className="toolbar"><Field label="Add a device">{(id) => <select id={id} value={cat} onChange={(e) => setCat(e.target.value)} data-testid="add-category">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>}</Field><Button busy={add.busy} onClick={() => void add.run(undefined)} testId="add-device">Add</Button></div>
        : <Notice tone="muted">{d.room.lifecycle === 'PLANNED' ? 'Your role reads the design; a designer or systems engineer changes it.' : 'The design is frozen after approval: devices change through a new design revision.'}</Notice>}
      {add.error || remove.error ? <ErrorState error={(add.error || remove.error)!} /> : null}
      <DataTable rows={d.devices.filter((x) => !x.furniture)} columns={cols} rowKey={(x) => x.id} caption="Devices" dense />
      <h2 className="h3">Connections <span className="ui-meta">{d.connections.length}</span></h2>
      <DataTable rows={d.connections} rowKey={(x) => x.id} dense caption="Connections" empty={<Empty title="No connections proposed" />} columns={[
        { key: 'id', header: 'Connection', render: (x) => <span className="mono">{x.id}</span> },
        { key: 'from', header: 'From', render: (x) => <span className="mono">{x.from}</span> }, { key: 'to', header: 'To', render: (x) => <span className="mono">{x.to}</span> },
        { key: 'kind', header: 'Kind', render: (x) => <Tag tone="info">{x.kind}</Tag> }, { key: 'why', header: 'Why', render: (x) => <span className="ui-meta">{x.why}</span> },
        ...(editable ? [{ key: 'act', header: '', render: (x: { id: string }) => <Button small kind="danger" onClick={() => void dropConn.run(x.id)}>Remove</Button> }] : []),
      ]} />
      <Drawer open={!!swap} title={`Change model of ${swap?.id}`} onClose={() => setSwap(null)} footer={<><Button onClick={() => setSwap(null)}>Cancel</Button><Button kind="primary" busy={change.busy} onClick={async () => { if (await change.run(undefined)) setSwap(null); }}>Change model</Button></>}>
        <p>The asset keeps its id; the model history is kept and the design checks and test plan re-run.</p>
        <Field label="Model">{(id) => <input id={id} value={model} onChange={(e) => setModel(e.target.value)} maxLength={80} />}</Field>
        {change.error ? <ErrorState error={change.error} /> : null}
      </Drawer>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ issues
function Issues({ d }: { d: RoomDetail }) {
  const { can } = useMe();
  const code = d.room.code;
  const [assign, setAssign] = useState<Issue | null>(null); const [owner, setOwner] = useState('service');
  const a = useMutation(() => api.call('postV1IssuesIssueAssign', { params: { issue: assign!.code }, body: { ownerRole: owner } }), [`room:${code}`]);
  const wo = useMutation((issue: string) => api.call('postV1IssuesIssueWorkOrders', { params: { issue }, idempotencyKey: newKey(), body: { assignedRole: 'service', note: 'raised from the enterprise web app' } }), [`room:${code}`, `history:${code}`]);
  const ap = useMutation((issue: string) => api.call('postV1IssuesIssueApex' as never, { params: { issue }, idempotencyKey: newKey() } as never) as Promise<unknown>, [`room:${code}`, 'apex']);
  const cols: Column<Issue>[] = [
    { key: 'code', header: 'Issue', render: (x) => <span className="mono">{x.code}</span>, sort: (x) => x.code, width: '110px' },
    { key: 'sev', header: 'Severity', render: (x) => <StatusBadge table={SEVERITY} value={x.severity} />, sort: (x) => ['Critical', 'High', 'Medium', 'Low'].indexOf(x.severity) },
    { key: 'title', header: 'Finding', render: (x) => <div><div>{x.title}</div><div className="ui-meta">{x.rationale}</div></div> },
    { key: 'cat', header: 'Category', render: (x) => <span className="ui-meta">{x.category.replace(/_/g, ' ').toLowerCase()}</span> },
    { key: 'state', header: 'State', render: (x) => <Tag tone={x.state === 'OPEN' ? 'warn' : 'ok'}>{x.state}</Tag>, sort: (x) => x.state },
    { key: 'owner', header: 'Owner', render: (x) => x.owner_role || <span className="ui-muted">unassigned</span> },
    { key: 'act', header: '', render: (x) => x.state !== 'OPEN' ? null : <span className="acts">
      {can(['issue.assign', 'route.internal']) ? <Button small kind="quiet" onClick={() => setAssign(x)}>Assign</Button> : null}
      {can(['service.assign', 'service.triage']) && x.category === 'INSTALLATION_COMMISSIONING_DEFICIENCY' ? <Button small kind="quiet" busy={wo.busy} onClick={() => void wo.run(x.code)}>Raise work order</Button> : null}
      {can(APEX_OPEN) ? <Button small kind="quiet" busy={ap.busy} onClick={async () => { const r = await ap.run(x.code); if (r) location.hash = `#/apex/${(r as { caseId: string }).caseId}`; }}>Open APEX case</Button> : null}
    </span> },
  ];
  return (
    <div className="stack">
      <Notice tone="muted">Design deficiencies change the design; installation and commissioning deficiencies get a field work order. Closing a work order never passes a test — only a verified retest resolves the deficiency.</Notice>
      {wo.error ? <ErrorState error={wo.error} /> : null}
      <DataTable rows={d.issues} columns={cols} rowKey={(x) => x.code} caption="Issues" empty={<Empty title="No issues">The design checks found nothing, and no test has failed.</Empty>} />
      <Drawer open={!!assign} title={`Assign ${assign?.code}`} onClose={() => setAssign(null)} footer={<><Button onClick={() => setAssign(null)}>Cancel</Button><Button kind="primary" busy={a.busy} onClick={async () => { if (await a.run(undefined)) setAssign(null); }}>Assign</Button></>}>
        <Field label="Owner role">{(id) => <select id={id} value={owner} onChange={(e) => setOwner(e.target.value)}>{['service', 'svcmgr', 'syseng', 'designer', 'installer', 'cxeng', 'dsp_eng', 'video_eng', 'control_eng'].map((r) => <option key={r}>{r}</option>)}</select>}</Field>
        {a.error ? <ErrorState error={a.error} /> : null}
      </Drawer>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ commissioning
function Commissioning({ d }: { d: RoomDetail }) {
  const { me, can } = useMe();
  const code = d.room.code; const cx = d.commissioning;
  const [all, setAll] = useState(false); const [rec, setRec] = useState<PlanRow | null>(null);
  const verify = useMutation((test: string) => api.call('postV1RoomsRoomResultsTestVerify', { params: { room: code, test } }), [`room:${code}`, 'report']);
  if (!cx) return <Empty title="No commissioning plan yet" />;
  const app = cx.rows.filter((x) => x.applicable);
  const n = (k: string) => app.filter((x) => x.result === k).length;
  const canRecord = (x: PlanRow) => d.room.lifecycle === 'COMMISSIONING' && x.applicable && (x.personas.includes(me.role) || ['cxeng', 'architect'].includes(me.role));
  const cols: Column<PlanRow>[] = [
    { key: 'test', header: 'Test', render: (x) => <div><div>{x.label}</div><div className="ui-meta mono">{x.test_id}</div></div>, sort: (x) => x.test_id },
    { key: 'domain', header: 'Domain', render: (x) => x.domain, sort: (x) => x.domain },
    { key: 'phase', header: 'Phase', render: (x) => x.phase, sort: (x) => x.phase, align: 'right' },
    { key: 'who', header: 'Responsible', render: (x) => <span className="ui-meta">{x.personas.join(', ')}</span> },
    { key: 'ev', header: 'Evidence accepted', render: (x) => <span className="ui-meta">{x.evidence.join(', ')}{x.instrument ? ' · instrument' : ''}</span> },
    { key: 'res', header: 'Result', render: (x) => x.applicable ? <StatusBadge table={RESULT} value={x.result} /> : <span className="ui-muted">not applicable</span>, sort: (x) => x.result },
    { key: 'act', header: '', render: (x) => <span className="acts">
      {canRecord(x) ? <Button small kind="quiet" onClick={() => setRec(x)}>Record</Button> : null}
      {x.result === 'PASS_UNVERIFIED' && can(['tests.verify.all', 'test.verify', 'customer.accept']) ? <Button small kind="quiet" busy={verify.busy} onClick={() => void verify.run(x.test_id)}>Verify</Button> : null}
    </span> },
  ];
  return (
    <div className="stack">
      <Composition label="Applicable tests by result" total={app.length} parts={[
        { key: 'v', label: 'Passed, verified', value: n('PASS_VERIFIED'), tone: 'ok' }, { key: 'u', label: 'Awaiting verification', value: n('PASS_UNVERIFIED'), tone: 'info' },
        { key: 'f', label: 'Failed', value: n('FAIL'), tone: 'bad' }, { key: 'o', label: 'Not supported / inconclusive', value: n('NOT_SUPPORTED') + n('INCONCLUSIVE'), tone: 'warn' },
        { key: 'n', label: 'Not tested', value: n('NOT_TESTED'), tone: 'muted' }]} />
      <p className="ui-meta">Plan {cx.planId.slice(0, 8)} · engine {cx.engineVersion} · rules {cx.ruleVersion} · {cx.applicable} of {cx.library} tests apply to this room.{d.room.lifecycle !== 'COMMISSIONING' ? ' Results are recorded once the room is installed and in commissioning: nothing passes from a design.' : ''}</p>
      {verify.error ? <ErrorState error={verify.error} /> : null}
      <label className="check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show tests that do not apply ({cx.rows.length - app.length})</label>
      <DataTable rows={all ? cx.rows : app} columns={cols} rowKey={(x) => x.test_id} caption="Commissioning plan" dense />
      {rec ? <RecordResult room={code} row={rec} onClose={() => setRec(null)} /> : null}
    </div>
  );
}

function RecordResult({ room, row, onClose }: { room: string; row: PlanRow; onClose: () => void }) {
  const [state, setState] = useState('PASS'); const [kind, setKind] = useState(row.evidence[0] || ''); const [instrument, setInstrument] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const m = useMutation(async () => {
    if (!file) throw Object.assign(new Error('choose an evidence file (photo, PDF, CSV, JSON or text)'), { status: 400 });
    const ev = await api.call('postV1Evidence', { body: new Uint8Array(await file.arrayBuffer()), contentType: file.type || 'application/octet-stream', fileName: file.name });
    return api.call('postV1RoomsRoomResults', { params: { room }, idempotencyKey: newKey(), body: { testId: row.test_id, state: state as never, evidenceId: ev.id, evidenceKind: kind, ...(instrument ? { instrument } : {}) } });
  }, [`room:${room}`, 'report', `history:${room}`]);
  return (
    <Drawer open title={`Record ${row.label}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button kind="primary" busy={m.busy} onClick={async () => { if (await m.run(undefined)) onClose(); }} testId="record-submit">Record result</Button></>}>
      <Notice tone="muted">A PASS is recorded as “awaiting verification” until a different person verifies it. A FAIL opens a commissioning deficiency.</Notice>
      <Field label="Outcome">{(id) => <select id={id} value={state} onChange={(e) => setState(e.target.value)}>{['PASS', 'FAIL', 'NOT_SUPPORTED', 'INCONCLUSIVE'].map((s) => <option key={s}>{s}</option>)}</select>}</Field>
      <Field label="Evidence kind">{(id) => <select id={id} value={kind} onChange={(e) => setKind(e.target.value)}>{row.evidence.map((s) => <option key={s}>{s}</option>)}</select>}</Field>
      <Field label="Evidence file" hint="Stored content-addressed by SHA-256 and retained seven years; its hash is re-checked on every read.">{(id, h) => <input id={id} aria-describedby={h} type="file" accept="image/jpeg,image/png,application/pdf,text/csv,application/json,text/plain" onChange={(e) => setFile(e.target.files?.[0] || null)} data-testid="evidence-file" />}</Field>
      {row.instrument ? <Field label="Instrument and calibration" hint="Required: this test is instrument-measured.">{(id, h) => <input id={id} aria-describedby={h} value={instrument} onChange={(e) => setInstrument(e.target.value)} maxLength={200} />}</Field> : null}
      {m.error ? <ErrorState error={m.error} /> : null}
    </Drawer>
  );
}

// ------------------------------------------------------------------------------------------------ drawings and revisions
function Drawings({ d }: { d: RoomDetail }) {
  const { can } = useMe();
  const code = d.room.code; const planned = d.room.lifecycle === 'PLANNED';
  const [reason, setReason] = useState(''); const [cmp, setCmp] = useState<{ a: number; b: number } | null>(null);
  const gen = useMutation(() => api.call('postV1RoomsRoomDrawingsGenerate', { params: { room: code } }), [`room:${code}`]);
  const appr = useMutation((kind: string) => api.call('postV1RoomsRoomDrawingsKindApprove', { params: { room: code, kind } }), [`room:${code}`]);
  const save = useMutation(() => api.call('postV1RoomsRoomRevisions', { params: { room: code }, idempotencyKey: newKey(), body: { reason: reason || 'saved from the web app' } }), [`room:${code}`]);
  const diff = useQuery(cmp ? `cmp:${code}:${cmp.a}:${cmp.b}` : null, () => api.call('getV1RoomsRoomRevisionsCompare', { params: { room: code }, query: { a: String(cmp!.a), b: String(cmp!.b) } }));
  const err = gen.error || appr.error || save.error;
  return (
    <div className="stack">
      <div className="toolbar">
        {can('room.design') && planned ? <><Field label="Revision note">{(id) => <input id={id} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="what changed" />}</Field>
          <Button busy={save.busy} onClick={() => void save.run(undefined)}>Save revision</Button><Button busy={gen.busy} onClick={() => void gen.run(undefined)}>Generate drawings</Button></> : null}
      </div>
      {err ? <ErrorState error={err} /> : null}
      <Notice tone="muted">Generated drawings are engineering diagrams from the design data, not stamped construction drawings. A drawing whose input changed after approval turns “review required”.</Notice>
      <DataTable rows={d.drawings} rowKey={(x) => x.kind} caption="Drawings" dense empty={<Empty title="No drawings generated" />} columns={[
        { key: 'kind', header: 'Drawing', render: (x) => x.kind },
        { key: 'state', header: 'State', render: (x) => <Tag tone={x.state === 'APPROVED' ? 'ok' : x.state === 'REVIEW_REQUIRED' ? 'warn' : 'muted'}>{x.state.replace(/_/g, ' ')}</Tag> },
        { key: 'rev', header: 'Revision', render: (x) => x.revNo ?? '—', align: 'right' },
        { key: 'act', header: '', render: (x) => can('room.classify.approve') && (x.state === 'GENERATED' || x.state === 'REVIEW_REQUIRED') ? <Button small kind="quiet" busy={appr.busy} onClick={() => void appr.run(x.kind)}>Approve</Button> : null },
      ]} />
      <h2 className="h3">Revisions</h2>
      <DataTable rows={d.revisions} rowKey={(x) => String(x.rev_no)} caption="Revisions" dense columns={[
        { key: 'n', header: 'Rev', render: (x) => x.rev_no, align: 'right', width: '60px' },
        { key: 'why', header: 'Reason', render: (x) => x.reason },
        { key: 'sha', header: 'SHA-256', render: (x) => <span className="mono ui-meta" title={x.sha256}>{x.sha256.slice(0, 16)}…</span> },
        { key: 'at', header: 'Saved', render: (x) => new Date(x.created_at).toLocaleString() },
        { key: 'cmp', header: '', render: (x) => x.rev_no > 1 ? <Button small kind="quiet" onClick={() => setCmp({ a: x.rev_no - 1, b: x.rev_no })}>Compare with {x.rev_no - 1}</Button> : null },
      ]} />
      {cmp ? <div className="card"><h2 className="h3">Revision {cmp.a} → {cmp.b}</h2>{diff.error ? <ErrorState error={diff.error} /> : diff.data ? <pre className="json">{JSON.stringify(diff.data, null, 2)}</pre> : <Loading />}</div> : null}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ service history and read model
function Service({ code }: { code: string }) {
  const { can } = useMe();
  const h = useQuery<{ workOrders: Array<Record<string, string>>; issueEvents: Array<{ kind: string; at: string; issue: string; detail: Record<string, unknown> }> }>(`history:${code}`, () => api.call('getV1RoomsRoomServiceHistory', { params: { room: code } }) as never);
  const rm = useQuery<Record<string, unknown>>(`read:${code}`, () => api.call('getV1ReadRoomsRoom', { params: { room: code } }) as never);
  const close = useMutation((wo: string) => api.call('postV1WorkOrdersWorkOrderClose', { params: { workOrder: wo }, body: { note: 'field work recorded from the web app' } }), [`history:${code}`, `room:${code}`]);
  return (
    <div className="split">
      <div className="stack">
        <h2 className="h3">Work orders</h2>
        {close.error ? <ErrorState error={close.error} /> : null}
        {h.error ? <ErrorState error={h.error} /> : !h.data ? <Loading /> : <DataTable rows={h.data.workOrders} rowKey={(x) => x['code']!} dense caption="Work orders" empty={<Empty title="No work orders" />} columns={[
          { key: 'c', header: 'Work order', render: (x) => <span className="mono">{x['code']}</span> }, { key: 'i', header: 'Issue', render: (x) => <span className="mono">{x['issue']}</span> },
          { key: 's', header: 'State', render: (x) => <Tag tone={x['state'] === 'OPEN' ? 'warn' : 'ok'}>{x['state']}</Tag> }, { key: 'r', header: 'Assigned', render: (x) => x['assigned_role'] },
          { key: 'a', header: '', render: (x) => x['state'] === 'OPEN' && can('service.close') ? <Button small kind="quiet" busy={close.busy} onClick={() => void close.run(x['code']!)}>Close</Button> : null },
        ]} />}
        <h2 className="h3">Issue history</h2>
        {h.data ? <ol className="timeline">{h.data.issueEvents.map((e, i) => <li key={i}><span className="mono">{e.issue}</span> {e.kind.replace(/_/g, ' ')} <span className="ui-meta">{new Date(e.at).toLocaleString()}</span></li>)}</ol> : null}
      </div>
      <div className="stack">
        <h2 className="h3">Operational read model</h2>
        <p className="ui-meta">Built asynchronously by the outbox worker from the events above. Live health is not monitored in the starter.</p>
        {rm.error ? <ErrorState error={rm.error} retry={rm.reload} /> : !rm.data ? <Loading /> : <Facts items={[
          ['Lifecycle', String(rm.data['lifecycle_label'])], ['Devices', String(rm.data['devices'])], ['Open issues', String(rm.data['open_issues'])], ['Open high/critical', String(rm.data['open_high'])],
          ['Applicable tests', String(rm.data['applicable_tests'])], ['Verified', String((rm.data['results'] as Record<string, number>)?.['verified'])], ['Live health', <StatusBadge table={LIVE} value={String(rm.data['live_health'])} />],
          ['Rebuilt', new Date(String(rm.data['rebuilt_at'])).toLocaleString()]]} />}
        <Button small onClick={() => { invalidate(`read:${code}`); }}>Refresh</Button>
      </div>
    </div>
  );
}
