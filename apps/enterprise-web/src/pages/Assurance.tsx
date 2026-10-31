/**
 * P4-B: the readiness strip (where the room stands, what blocks the next step, who must act) and the Acceptance & assurance tab
 * (baseline lineage, exceptions, measurements with provenance, recommissioning). Every number comes from GET /v1/rooms/{room}/readiness,
 * /baselines, /measurements and /assurance; the page never computes a verdict of its own.
 */
import { useState } from 'react';
import { Button, Composition, DataTable, Drawer, Empty, ErrorState, Facts, Field, Loading, Notice, Tag, type Column } from '@empathia/ui';
import { api, newKey, useMutation, useQuery } from '../api.js';
import { useMe } from '../me.js';

interface Readiness { room: string; lifecycle: string; next: { to: string; authority: string; blockers: string[]; separationOfDuties: string | null } | null; completion: { percentVerified: number | null; basis: string; counts: { applicable: number; verified: number; awaiting: number; failed: number; other: number; notTested: number } }; design: { revisions: number; approvedRevision: number | null; classification: { archetype?: string; stale: boolean; at?: string } | null; checks: number }; deficiencies: Array<{ code: string; severity: string; title: string; owner: string | null }>; evidence: { objects: number; measurements: Array<{ provenance: string; approvalState: string; n: number }> }; baselines: Array<{ version: number; state: string; publishedAt: string }>; exceptionsPending: number; outstanding: Array<{ what: string; who: string; count?: number }>; approvals: Array<{ what: string; by: string | null; at: string; detail: Record<string, unknown> }>; refusals: Array<{ what: string; by: string | null; at: string; why: unknown }>; liveHealth: string }
interface Lineage { room: string; current: Baseline | null; items: Baseline[]; exceptions: Exception[] }
interface Baseline { id: string; version: number; state: string; design_revision: number; design_sha256: string; plan_id: string | null; results: Record<string, string>; evidence_ids: string[]; devices: Array<{ id: string; category: string; label: string }>; reason: string; published_by: string; published_at: string; supersedes: string | null; superseded_at: string | null }
interface Exception { id: string; baseline_id: string; kind: string; dimension: string; rationale: string; state: string; requested_by: string; requested_at: string; decided_by: string | null; decided_at: string | null; decision_note: string | null; expires_at: string | null }
interface Measurement { id: string; metric: string; value: string; unit: string; method: string; instrument_id: string | null; calibration_status: string; measured_at: string; location: string; source: string; provenance: string; uncertainty: string | null; uncertainty_unit: string | null; approval_state: string; recorded_role: string }

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { CURRENT: 'ok', SUPERSEDED: 'muted', WITHDRAWN: 'bad', REQUESTED: 'warn', APPROVED: 'ok', REJECTED: 'bad', VERIFIED: 'ok', UNREVIEWED: 'warn', FIELD_MEASURED: 'ok', SIMULATED: 'info', INFERRED: 'info', OBSERVED: 'warn', DESIGN_SPECIFIED: 'muted', CALIBRATED: 'ok', EXPIRED: 'bad', UNKNOWN: 'warn', NOT_APPLICABLE: 'muted' };

export function ReadinessStrip({ code }: { code: string }) {
  const q = useQuery<Readiness>(`readiness:${code}`, () => api.call('getV1RoomsRoomReadiness', { params: { room: code } } as never) as Promise<Readiness>);
  if (q.error) return <ErrorState error={q.error} retry={q.reload} />;
  if (!q.data) return <Loading label="Reading readiness" />;
  const r = q.data; const c = r.completion.counts;
  return (
    <section className="ready" aria-label="Readiness" data-testid="readiness">
      <div className="ready__grid">
        <div><span className="ready__k">Stage</span><b>{r.lifecycle}</b>{r.next && <span className="ui-meta">next {r.next.to} · {r.next.authority}{r.next.separationOfDuties ? ` · ${r.next.separationOfDuties}` : ''}</span>}</div>
        <div><span className="ready__k">Verified</span><b>{r.completion.percentVerified === null ? '—' : `${r.completion.percentVerified}%`}</b><span className="ui-meta">{c.verified} of {c.applicable} applicable tests independently verified</span></div>
        <div><span className="ready__k">Deficiencies</span><b>{r.deficiencies.length}</b><span className="ui-meta">{r.deficiencies.filter((d) => /High|Critical/.test(d.severity)).length} High/Critical open</span></div>
        <div><span className="ready__k">Evidence</span><b>{r.evidence.objects}</b><span className="ui-meta">objects · {r.evidence.measurements.reduce((n, m) => n + m.n, 0)} measurements</span></div>
        <div><span className="ready__k">Baseline</span><b>{r.baselines.find((b) => b.state === 'CURRENT') ? `v${r.baselines.find((b) => b.state === 'CURRENT')!.version}` : 'none'}</b><span className="ui-meta">{r.baselines.length} version{r.baselines.length === 1 ? '' : 's'}{r.exceptionsPending ? ` · ${r.exceptionsPending} exception pending` : ''}</span></div>
        <div><span className="ready__k">Live health</span><b>Not monitored</b><span className="ui-meta">no monitoring evidence on this room</span></div>
      </div>
      {r.next && r.next.blockers.length > 0 && <div className="ready__block" data-testid="blockers"><b>Before {r.next.to}:</b><ul>{r.next.blockers.map((b) => <li key={b}>{b}</li>)}</ul></div>}
      {r.next && !r.next.blockers.length && <p className="ready__ok">The gate to {r.next.to} is open for a holder of <code>{r.next.authority}</code>{r.next.separationOfDuties ? ` (${r.next.separationOfDuties})` : ''}.</p>}
      {r.outstanding.length > 0 && <details className="ready__out"><summary>Outstanding ({r.outstanding.length})</summary><ul>{r.outstanding.map((o, i) => <li key={i}><b>{o.what}</b>{o.count ? ` × ${o.count}` : ''} <span className="ui-meta">— {o.who}</span></li>)}</ul></details>}
      {(r.approvals.length > 0 || r.refusals.length > 0) && <details className="ready__out"><summary>Approval history ({r.approvals.length}) · audited refusals ({r.refusals.length})</summary>
        <ul>{r.approvals.map((a, i) => <li key={`a${i}`}><Tag tone="ok">ALLOWED</Tag> {a.what} <span className="ui-meta">{a.by} · {a.at}</span></li>)}{r.refusals.map((a, i) => <li key={`r${i}`}><Tag tone="bad">DENIED</Tag> {a.what} <span className="ui-meta">{a.by} · {a.at} · {Array.isArray(a.why) ? a.why.join('; ') : JSON.stringify(a.why).slice(0, 160)}</span></li>)}</ul></details>}
      <p className="ui-meta">{r.completion.basis}.</p>
    </section>
  );
}

export function AssuranceTab({ code, lifecycle }: { code: string; lifecycle: string }) {
  const { me, can } = useMe();
  const lin = useQuery<Lineage>(`baselines:${code}`, () => api.call('getV1RoomsRoomBaselines', { params: { room: code } } as never) as Promise<Lineage>);
  const meas = useQuery<{ items: Measurement[] }>(`measurements:${code}`, () => api.call('getV1RoomsRoomMeasurements', { params: { room: code } } as never) as Promise<{ items: Measurement[] }>);
  const recommission = useMutation(() => api.call('postV1RoomsRoomLifecycle', { params: { room: code }, body: { to: 'COMMISSIONING' as never } }), [`room:${code}`, `readiness:${code}`, `baselines:${code}`, 'rooms']);
  const decide = useMutation((a: { id: string; decision: 'APPROVED' | 'REJECTED' }) => api.call('postV1BaselineExceptionsIdDecide', { params: { id: a.id }, body: { decision: a.decision } } as never), [`baselines:${code}`, `readiness:${code}`]);
  const verifyM = useMutation((a: { id: string; decision: 'VERIFIED' | 'REJECTED' }) => api.call('postV1MeasurementsIdVerify', { params: { id: a.id }, body: { decision: a.decision } } as never), [`measurements:${code}`, `readiness:${code}`]);
  const [req, setReq] = useState(false); const [rec, setRec] = useState(false); const [imp, setImp] = useState(false);
  if (lin.error) return <ErrorState error={lin.error} retry={lin.reload} />;
  if (!lin.data || !meas.data) return <Loading label="Loading baselines and measurements" />;
  const L = lin.data; const cur = L.current;
  const bcols: Column<Baseline>[] = [
    { key: 'v', header: 'Version', render: (b) => <b>v{b.version}</b>, sort: (b) => b.version },
    { key: 's', header: 'State', render: (b) => <Tag tone={TONE[b.state] || 'muted'}>{b.state}</Tag> },
    { key: 'd', header: 'Design', render: (b) => <span className="ui-meta">rev {b.design_revision} · <span className="mono">{b.design_sha256.slice(0, 12)}</span></span> },
    { key: 'r', header: 'Results bound', render: (b) => <span className="ui-meta">{Object.keys(b.results).length} labels · {Object.values(b.results).filter((x) => x === 'PASS_VERIFIED').length} verified · {b.evidence_ids.length} evidence</span> },
    { key: 'p', header: 'Published', render: (b) => <span className="ui-meta">{b.published_at.slice(0, 19).replace('T', ' ')}{b.supersedes ? ' · supersedes the previous version' : ''}</span>, sort: (b) => b.published_at },
    { key: 'why', header: 'Reason', render: (b) => <span className="ui-meta">{b.reason}</span> },
  ];
  const mcols: Column<Measurement>[] = [
    { key: 'm', header: 'Metric', render: (m) => <div><b>{m.metric}</b><div className="ui-meta">{m.method}</div></div>, sort: (m) => m.metric },
    { key: 'v', header: 'Value', render: (m) => <span className="mono">{m.value} {m.unit}{m.uncertainty ? ` ± ${m.uncertainty} ${m.uncertainty_unit || ''}` : ''}</span>, align: 'right' },
    { key: 'p', header: 'Provenance', render: (m) => <Tag tone={TONE[m.provenance] || 'muted'}>{m.provenance}</Tag> },
    { key: 'c', header: 'Instrument', render: (m) => <span className="ui-meta">{m.instrument_id || '—'} · <Tag tone={TONE[m.calibration_status] || 'muted'}>{m.calibration_status}</Tag></span> },
    { key: 'w', header: 'Where / when', render: (m) => <span className="ui-meta">{m.location} · {m.measured_at.slice(0, 16).replace('T', ' ')} · {m.source}</span> },
    { key: 'a', header: 'Approval', render: (m) => <Tag tone={TONE[m.approval_state] || 'muted'}>{m.approval_state}</Tag> },
    { key: 'x', header: '', render: (m) => m.approval_state === 'UNREVIEWED' && can(['tests.verify.all', 'test.verify', 'customer.accept']) ? <span className="acts"><Button small kind="quiet" busy={verifyM.busy} onClick={() => void verifyM.run({ id: m.id, decision: 'VERIFIED' })}>Verify</Button><Button small kind="quiet" onClick={() => void verifyM.run({ id: m.id, decision: 'REJECTED' })}>Reject</Button></span> : null },
  ];
  return (
    <div className="stack">
      <div className="card stack">
        <h2 className="h3">Baseline lineage</h2>
        {!L.items.length ? <Empty title="No baseline yet">A baseline is published only by an authorized acceptance; nothing here is hand-written.</Empty> : (
          <>
            <Facts items={[['Current', cur ? `v${cur.version} (design revision ${cur.design_revision})` : '—'], ['Versions', L.items.length], ['Immutable', 'yes — a later acceptance supersedes, never overwrites'], ['Exceptions', `${L.exceptions.filter((e) => e.state === 'REQUESTED').length} pending · ${L.exceptions.filter((e) => e.state === 'APPROVED').length} approved`]]} />
            <DataTable rows={L.items} columns={bcols} rowKey={(b) => b.id} caption="Baseline versions" dense />
            {L.items.length >= 2 && <Diff a={L.items[L.items.length - 2]!} b={L.items[L.items.length - 1]!} />}
          </>)}
        <div className="acts">
          {lifecycle === 'ACCEPTED' && can('plan.compile') ? <Button busy={recommission.busy} onClick={() => void recommission.run(undefined)} testId="recommission">Recommission (back to commissioning)</Button> : null}
          {cur && can(['baseline.approve', 'test.verify', 'tests.verify.all', 'work.evidence']) ? <Button kind="secondary" onClick={() => setReq(true)}>Request an exception</Button> : null}
        </div>
        {recommission.error ? <ErrorState error={recommission.error} /> : null}
        {lifecycle === 'ACCEPTED' && <Notice tone="muted">Recommissioning keeps v{cur?.version ?? '?'} current while new results are recorded; the next acceptance publishes v{(cur?.version ?? 0) + 1}.</Notice>}
      </div>
      {L.exceptions.length > 0 && <div className="card stack"><h2 className="h3">Exceptions</h2>
        <ul className="list">{L.exceptions.map((e) => <li key={e.id}><Tag tone={TONE[e.state] || 'muted'}>{e.state}</Tag> <b>{e.kind}</b> · {e.dimension} <span className="ui-meta">— {e.rationale}{e.expires_at ? ` · until ${e.expires_at.slice(0, 10)}` : ''}{e.decision_note ? ` · decision: ${e.decision_note}` : ''}</span>
          {e.state === 'REQUESTED' && can('baseline.approve') ? <span className="acts"><Button small busy={decide.busy} onClick={() => void decide.run({ id: e.id, decision: 'APPROVED' })}>Approve</Button><Button small kind="quiet" onClick={() => void decide.run({ id: e.id, decision: 'REJECTED' })}>Reject</Button></span> : null}</li>)}</ul>
        {decide.error ? <ErrorState error={decide.error} /> : null}
        <p className="ui-meta">An exception is decided by someone other than its requester; the server refuses otherwise.</p></div>}
      <div className="card stack">
        <h2 className="h3">Measurements</h2>
        <p className="ui-meta">Each value keeps its provenance. Only a field measurement from a calibrated instrument can be verified; a simulated or inferred value is shown as what it is. A level read from a file (dBFS) is never recorded as a sound pressure level.</p>
        {meas.data.items.length ? <DataTable rows={meas.data.items} columns={mcols} rowKey={(m) => m.id} caption="Measurements" dense /> : <Empty title="No measurement recorded" />}
        {verifyM.error ? <ErrorState error={verifyM.error} /> : null}
        {can(['work.evidence', 'field.scan', 'test.verify', 'tests.verify.all', 'fi.plan', 'fi.monitor', 'fipv.operate', 'lite.edit']) ? <div><Button onClick={() => setRec(true)} testId="record-measurement">Record a measurement</Button> <Button onClick={() => setImp(true)} testId="import-measurements">Import an instrument export</Button></div> : null}
        <p className="ui-meta">Signed in as {me.role}: the verifier must not be the recorder.</p>
      </div>
      {req ? <RequestException room={code} onClose={() => setReq(false)} /> : null}
      {rec ? <RecordMeasurement room={code} onClose={() => setRec(false)} /> : null}
      {imp ? <ImportMeasurements room={code} onClose={() => setImp(false)} /> : null}
    </div>
  );
}

function Diff({ a, b }: { a: Baseline; b: Baseline }) {
  const keys = [...new Set([...Object.keys(a.results), ...Object.keys(b.results)])].sort();
  const changed = keys.filter((k) => a.results[k] !== b.results[k]);
  const devA = new Set(a.devices.map((d) => d.id)), devB = new Set(b.devices.map((d) => d.id));
  const added = b.devices.filter((d) => !devA.has(d.id)), removed = a.devices.filter((d) => !devB.has(d.id));
  return (
    <div className="diff" data-testid="baseline-diff">
      <h3 className="h3">v{a.version} → v{b.version}</h3>
      <Facts items={[['Design revision', a.design_revision === b.design_revision ? `unchanged (${a.design_revision})` : `${a.design_revision} → ${b.design_revision}`], ['Result labels', changed.length ? `${changed.length} changed of ${keys.length}` : `identical labels (${keys.length}); the versions bind different result objects and evidence`], ['Devices', added.length || removed.length ? `${added.length} added, ${removed.length} removed` : 'unchanged'], ['Evidence', `${a.evidence_ids.length} → ${b.evidence_ids.length} objects`]]} />
      {changed.length > 0 && <ul className="list">{changed.map((k) => <li key={k}><span className="mono">{k}</span> {a.results[k] || '—'} → <b>{b.results[k] || '—'}</b></li>)}</ul>}
    </div>
  );
}

function RequestException({ room, onClose }: { room: string; onClose: () => void }) {
  const [kind, setKind] = useState('TEMPORARY_WAIVER'); const [dimension, setDimension] = useState('acoustics'); const [rationale, setRationale] = useState(''); const [expires, setExpires] = useState('');
  const m = useMutation(() => api.call('postV1RoomsRoomBaselinesExceptions', { params: { room }, body: { kind, dimension, rationale, ...(expires ? { expiresAt: expires } : {}) } } as never), [`baselines:${room}`, `readiness:${room}`]);
  return (
    <Drawer open title="Request a baseline exception" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button kind="primary" busy={m.busy} onClick={async () => { if (await m.run(undefined)) onClose(); }}>Request</Button></>}>
      <Field label="Kind">{(id) => <select id={id} value={kind} onChange={(e) => setKind(e.target.value)}>{['ACCEPTED_DEVIATION', 'TEMPORARY_WAIVER', 'KNOWN_GAP'].map((k) => <option key={k}>{k}</option>)}</select>}</Field>
      <Field label="Dimension">{(id) => <input id={id} value={dimension} onChange={(e) => setDimension(e.target.value)} maxLength={40} />}</Field>
      <Field label="Rationale" hint="At least 5 characters; kept with the request and shown to the decider.">{(id, h) => <input id={id} aria-describedby={h} value={rationale} onChange={(e) => setRationale(e.target.value)} maxLength={4000} />}</Field>
      <Field label="Expires (optional)">{(id) => <input id={id} type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />}</Field>
      {m.error ? <ErrorState error={m.error} /> : null}
    </Drawer>
  );
}

function RecordMeasurement({ room, onClose }: { room: string; onClose: () => void }) {
  const [f, setF] = useState({ metric: 'noise_floor', value: '', unit: 'dB(A)', method: 'LAeq 60 s', instrumentId: '', calibrationStatus: 'UNKNOWN', calibrationDue: '', location: '', source: '', provenance: 'FIELD_MEASURED', uncertainty: '', uncertaintyUnit: 'dB' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const m = useMutation(() => api.call('postV1RoomsRoomMeasurements', { params: { room }, idempotencyKey: newKey(), body: { metric: f.metric, value: Number(f.value), unit: f.unit, method: f.method, measuredAt: new Date().toISOString(), location: f.location, source: f.source, provenance: f.provenance, ...(f.instrumentId ? { instrumentId: f.instrumentId, calibrationStatus: f.calibrationStatus } : {}), ...(f.calibrationDue ? { calibrationDue: f.calibrationDue } : {}), ...(f.uncertainty ? { uncertainty: Number(f.uncertainty), uncertaintyUnit: f.uncertaintyUnit } : {}) } } as never), [`measurements:${room}`, `readiness:${room}`]);
  return (
    <Drawer open title="Record a measurement" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button kind="primary" busy={m.busy} onClick={async () => { if (await m.run(undefined)) onClose(); }} testId="measurement-submit">Record</Button></>}>
      <Notice tone="muted">Provenance never changes afterwards. Pick what the value really is: a field measurement names its instrument; a model output is SIMULATED; a level read from a recording is INFERRED and stays in dBFS.</Notice>
      <div className="row2">
        <Field label="Metric">{(id) => <input id={id} value={f.metric} onChange={set('metric')} maxLength={60} />}</Field>
        <Field label="Provenance">{(id) => <select id={id} value={f.provenance} onChange={set('provenance')}>{['FIELD_MEASURED', 'OBSERVED', 'INFERRED', 'SIMULATED', 'DESIGN_SPECIFIED'].map((p) => <option key={p}>{p}</option>)}</select>}</Field>
        <Field label="Value">{(id) => <input id={id} inputMode="decimal" value={f.value} onChange={set('value')} data-testid="m-value" />}</Field>
        <Field label="Unit">{(id) => <input id={id} value={f.unit} onChange={set('unit')} maxLength={20} />}</Field>
        <Field label="Method">{(id) => <input id={id} value={f.method} onChange={set('method')} maxLength={200} />}</Field>
        <Field label="Location">{(id) => <input id={id} value={f.location} onChange={set('location')} maxLength={200} placeholder="seat 3, 1.2 m" />}</Field>
        <Field label="Source">{(id) => <input id={id} value={f.source} onChange={set('source')} maxLength={200} placeholder="instrument, file or model" />}</Field>
        <Field label="Uncertainty">{(id) => <input id={id} inputMode="decimal" value={f.uncertainty} onChange={set('uncertainty')} />}</Field>
      </div>
      {f.provenance === 'FIELD_MEASURED' && <div className="row2">
        <Field label="Instrument id" hint="Required for a field measurement.">{(id, h) => <input id={id} aria-describedby={h} value={f.instrumentId} onChange={set('instrumentId')} maxLength={80} />}</Field>
        <Field label="Calibration">{(id) => <select id={id} value={f.calibrationStatus} onChange={set('calibrationStatus')}>{['CALIBRATED', 'EXPIRED', 'UNKNOWN'].map((p) => <option key={p}>{p}</option>)}</select>}</Field>
        <Field label="Calibration due">{(id) => <input id={id} type="date" value={f.calibrationDue} onChange={set('calibrationDue')} />}</Field>
      </div>}
      {m.error ? <ErrorState error={m.error} /> : null}
    </Drawer>
  );
}

interface ImportReport { importId?: string; dryRun?: boolean; alreadyImported?: string | null; file: { name: string; rows: number }; accepted: number; rejected: number; errors: Array<{ row: number; reasons: string[] }>; calibrated: number; expiredCalibration: number; note: string }

/** Instrument export import (ADR-0011): upload the CSV as evidence, check it (dry run), then import. All-or-nothing; each value keeps its file, row, instrument and calibration. */
function ImportMeasurements({ room, onClose }: { room: string; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null); const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [f, setF] = useState({ instrumentId: '', instrumentModel: '', calibrationRef: '', calibrationDue: '', method: 'LAeq 60 s', uncertainty: '', uncertaintyUnit: 'dB' });
  const [report, setReport] = useState<ImportReport | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setReport(null); };
  const body = (id: string, dryRun: boolean) => ({ evidenceId: id, instrumentId: f.instrumentId, instrumentModel: f.instrumentModel || undefined, calibrationRef: f.calibrationRef, calibrationDue: f.calibrationDue, method: f.method, uncertainty: f.uncertainty === '' ? undefined : Number(f.uncertainty), uncertaintyUnit: f.uncertainty === '' ? undefined : f.uncertaintyUnit, dryRun });
  const run = useMutation(async (dryRun: boolean) => {
    let id = evidenceId;
    if (!id) { const ev = await api.call('postV1Evidence', { body: new Uint8Array(await file!.arrayBuffer()), contentType: file!.type || 'text/csv', fileName: file!.name } as never) as { id: string }; id = ev.id; setEvidenceId(id); }
    return api.call('postV1RoomsRoomMeasurementsImport' as never, { params: { room }, idempotencyKey: newKey(), body: body(id, dryRun) } as never) as Promise<ImportReport>;
  }, [`measurements:${room}`]);
  const ready = !!file && f.instrumentId.length >= 2 && f.calibrationRef.length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(f.calibrationDue) && f.method.length >= 2;
  return (
    <Drawer open title="Import an instrument export" onClose={onClose} footer={<><Button onClick={onClose}>{report && !report.dryRun ? 'Done' : 'Cancel'}</Button>
      <Button busy={run.busy} disabled={!ready} onClick={async () => { const r = await run.run(true); if (r) setReport(r as ImportReport); }} testId="import-check">Check the file</Button>
      <Button kind="primary" busy={run.busy} disabled={!ready || !report?.dryRun || report.rejected > 0 || !!report.alreadyImported} onClick={async () => { const r = await run.run(false); if (r) setReport(r as ImportReport); }} testId="import-submit">Import {report?.dryRun && !report.rejected ? `${report.accepted} values` : ''}</Button></>}>
      <Notice tone="muted">A CSV with the columns metric, value, unit, measured_at, location (optional: uncertainty). Every row is checked; if any row is invalid nothing is imported. Each value is recorded as a field measurement linked to this file and row, the instrument and its calibration certificate. A value measured after the calibration due date is recorded as EXPIRED and can never be verified.</Notice>
      <Field label="Instrument export (CSV)">{(id) => <input id={id} type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] || null); setEvidenceId(null); setReport(null); }} data-testid="import-file" />}</Field>
      <div className="row2">
        <Field label="Instrument id">{(id) => <input id={id} value={f.instrumentId} onChange={set('instrumentId')} maxLength={80} />}</Field>
        <Field label="Instrument model">{(id) => <input id={id} value={f.instrumentModel} onChange={set('instrumentModel')} maxLength={120} />}</Field>
        <Field label="Calibration certificate">{(id) => <input id={id} value={f.calibrationRef} onChange={set('calibrationRef')} maxLength={120} />}</Field>
        <Field label="Calibration due">{(id) => <input id={id} type="date" value={f.calibrationDue} onChange={set('calibrationDue')} />}</Field>
        <Field label="Method">{(id) => <input id={id} value={f.method} onChange={set('method')} maxLength={80} />}</Field>
        <Field label="Instrument uncertainty">{(id) => <input id={id} inputMode="decimal" value={f.uncertainty} onChange={set('uncertainty')} placeholder="e.g. 0.7" />}</Field>
      </div>
      {run.error ? <ErrorState error={run.error} /> : null}
      {report ? <section className="stack" data-testid="import-report">
        {report.alreadyImported ? <Notice tone="warn">{report.note}</Notice> : report.rejected ? <Notice tone="bad">{report.rejected} of {report.file.rows} rows are invalid; nothing can be imported until the file is corrected.</Notice>
          : <Notice tone={report.dryRun ? 'info' : 'ok'}>{report.dryRun ? `${report.accepted} rows are valid: ${report.calibrated} within the calibration, ${report.expiredCalibration} after its due date.` : `Imported ${report.accepted} values. ${report.note}`}</Notice>}
        {report.errors.length ? <ul className="ui-meta">{report.errors.map((e) => <li key={e.row}>Row {e.row}: {e.reasons.join('; ')}</li>)}</ul> : null}
      </section> : null}
    </Drawer>
  );
}
