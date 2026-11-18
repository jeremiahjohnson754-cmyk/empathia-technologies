/**
 * From the last check to the accepted baseline (founder, 17 Nov 2026: "complete documentation, and create the accepted Assurance
 * baseline… the original design should remain preserved alongside the approved as-built and the accepted baseline").
 *
 *   documentation   the handover checks of the plan (training, support path, spares, warranty and licence register, runbook). Each is
 *                   recorded one at a time with what was handed over; in a demonstration a written note stands in for the document
 *                   and is uploaded as the evidence file.
 *   the rest        every other check without a result is recorded, one request each, on one synthetic observation note. A check
 *                   that has a criterion is not among them: it is measured at its bench.
 *   verification    every recorded pass is verified, one request each, by someone who did not record it.
 *   sign-off        the verifier lends the acceptance to the operations lead (a record with a reason and an expiry); the operations
 *                   lead accepts. The server publishes the baseline, or refuses and says what is still in the way.
 *
 * The baseline card shows the server's record: the design revision and its hash, each device's designed and as-built place, and the
 * measured values the room was accepted on with the limits they were judged against. Nothing here computes or keeps any of it.
 */
import { useState } from 'react';
import { Card, Tag } from '@empathia/ui';
import type { Answer, Said, Tools } from './CorrectiveAction.js';

export interface PlanRow { test_id: string; label: string; pack: string; phase: number; personas: string[]; evidence: string[]; instrument: boolean; result: string }
interface Point { x: number; y: number }
export interface Baseline { id: string; version: number; design_revision: number; design_sha256: string; results: Record<string, string>; evidence_ids: string[]; published_at: string; published_by_name: string; reason: string;
  devices: Array<{ id: string; label: string; placement: { designed: Point; asBuilt: (Point & { move: string }) | null; at: Point; basis: string } | null }>;
  measurements: Array<{ test: string; metric: string; value: number; unit: string; provenance: string; criterion: { version: number; lower: number | null; upper: number | null; source: string } | null }> }
export interface Person { role: string; name: string; id: string }
/** The documentation matrix as the server holds it (0043): the documents this room requires, each one's versions, the percentage, the signatures. */
export interface DocMatrix { status: { required: number; approved: number; percent: number; missing: string[]; waiting: string[]; rejected: string[]; unsigned: string[]; complete: boolean; open: boolean };
  documents: Array<{ kind: string; label: string; photo: boolean; required: boolean; versions: Array<{ version: number; state: string; fileName: string; reviewNote: string | null }> }>;
  packet: string | null; signatures: Array<{ side: string; name: string | null; role: string; at: string; current: boolean }>; may: { submit: boolean; review: boolean; sign: { VENDOR: boolean; INTERNAL: boolean } } }

const words = (x: string) => x.replace(/_/g, ' ').toLowerCase();
const at = (p: Point) => `${p.x} m across, ${p.y} m from the front`;
const limit = (c: { lower: number | null; upper: number | null }, unit: string) => (c.lower !== null && c.upper !== null ? `between ${c.lower} and ${c.upper} ${unit}` : c.upper !== null ? `at most ${c.upper} ${unit}` : `at least ${c.lower} ${unit}`);
const INSTRUMENT = 'SYN-METER-01 (synthetic), calibration record SYN-CAL-2026-09';

export function Finishing({ room, lifecycle, rows, counts, measuredTests, people, matrix, t }: { room: string; lifecycle: string; rows: PlanRow[]; counts: { recorded: number; verified: number; applicable: number }; measuredTests: string[]; people: Person[]; matrix: DocMatrix | null; t: Tools }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const docs = rows.filter((r) => r.pack === 'handover'); const passed = (r: PlanRow) => /^PASS/.test(r.result);
  const rest = rows.filter((r) => r.pack !== 'handover' && !passed(r) && !measuredTests.includes(r.test_id)); const atBench = rows.filter((r) => measuredTests.includes(r.test_id) && !passed(r));
  const toVerify = rows.filter((r) => r.result === 'PASS_UNVERIFIED'); const allVerified = rows.length > 0 && rows.every((r) => r.result === 'PASS_VERIFIED');
  const upload = async (text: string, name: string): Promise<Answer<{ id: string }>> => t.call<{ id: string }>('POST', '/v1/evidence', undefined, { text, fileName: name });
  const record = (r: PlanRow) => t.act(`Recording “${r.label}”…`, async (): Promise<Said> => { const note = (notes[r.test_id] || '').trim();
    const ev = await upload(`Handover record for ${room} (synthetic; a note stands in for the document).\n${r.label}: ${note}`, `${r.test_id}.txt`); if (!ev.ok) return t.refused(ev, 'the document');
    const a = await t.call('POST', `/v1/rooms/${room}/results`, { testId: r.test_id, state: 'PASS', evidenceId: ev.body.id, evidenceKind: r.evidence[0], ...(r.instrument ? { instrument: INSTRUMENT } : {}) }); if (!a.ok) return t.refused(a, `“${r.label}”`);
    setNotes((n) => ({ ...n, [r.test_id]: '' })); return { ok: true, title: `“${r.label}” is recorded.`, text: 'It waits for someone else to verify it.' }; });
  const passAll = () => t.act(`Recording ${rest.length} checks, one request each…`, async (): Promise<Said> => {
    const ev = await upload(`Synthetic observation for ${room}: the remaining commissioning checks, recorded for a demonstration. No room was observed.`, 'remaining-checks-synthetic-observation.txt'); if (!ev.ok) return t.refused(ev, 'the observation note');
    let n = 0; for (const r of rest) { const a = await t.call('POST', `/v1/rooms/${room}/results`, { testId: r.test_id, state: 'PASS', evidenceId: ev.body.id, evidenceKind: r.evidence[0], ...(r.instrument ? { instrument: INSTRUMENT } : {}) });
      if (!a.ok) return { ...t.refused(a, `“${r.label}”`), title: `Stopped at “${r.label}” after ${n} recorded (${a.status}).` }; n += 1; }
    return { ok: true, title: `${n} checks recorded.`, text: 'Each on the same synthetic observation note, and each waiting for someone else to verify it. This is a demonstration of the record, not a commissioning.' }; });
  const verifyAll = () => t.act(`Verifying ${toVerify.length} results, one request each…`, async (): Promise<Said> => {
    let n = 0; for (const r of toVerify) { const a = await t.call('POST', `/v1/rooms/${room}/results/${r.test_id}/verify`); if (!a.ok) return { ...t.refused(a, `the verification of “${r.label}”`), title: `Stopped at “${r.label}” after ${n} verified (${a.status}).` }; n += 1; }
    return { ok: true, title: `${n} results verified.`, text: 'None by the person who recorded it.' }; });
  const lend = () => t.act('Lending the acceptance…', async (): Promise<Said> => { const ops = people.find((p) => p.role === 'opslead'); if (!ops) return { ok: false, title: 'There is no operations lead to lend it to.', text: 'The people of this sandbox could not be read as this person.' };
    const a = await t.call('POST', '/v1/delegations', { granteeId: ops.id, authority: 'customer.accept', reason: 'synthetic: the person who verified does not also accept', days: 2 }); if (!a.ok) return t.refused(a, 'the loan of the acceptance');
    return { ok: true, title: `The acceptance is lent to ${ops.name} for two days.`, text: 'A record with a reason and an expiry: the person who verified does not also accept.' }; });
  const accept = () => t.act('Asking the server to accept the room…', async (): Promise<Said> => { const a = await t.call('POST', `/v1/rooms/${room}/lifecycle`, { to: 'ACCEPTED' }); if (!a.ok) return t.refused(a, 'the acceptance');
    return { ok: true, title: 'The room is accepted.', text: 'The server published baseline 1: the design revision and its hash, where each device is, the results, the evidence and the measured values it was accepted on.' }; });
  // Documentation & Submission (0043): one evidence file per required document (a written note stands in for it here), reviewed by
  // someone other than its submitter, then the packet signed for the integrator and for the owner by two different people
  const req = (matrix?.documents || []).filter((d) => d.required); const last = (d: DocMatrix['documents'][number]) => d.versions[d.versions.length - 1];
  const toSubmit = req.filter((d) => !last(d) || last(d)!.state === 'REJECTED'); const toReview = req.filter((d) => last(d)?.state === 'SUBMITTED');
  const submitDocs = () => t.act(`Submitting ${toSubmit.length} documents, one request each…`, async (): Promise<Said> => {
    let n = 0; for (const d of toSubmit) { const ev = await upload(`${d.label} for ${room} (synthetic: a note stands in for the document; no room was documented).`, `${d.kind}.txt`); if (!ev.ok) return t.refused(ev, d.label);
      const a = await t.call('POST', `/v1/rooms/${room}/documentation/${d.kind}`, { evidenceId: ev.body.id }); if (!a.ok) return { ...t.refused(a, d.label), title: `Stopped at ${d.label} after ${n} submitted (${a.status}).` }; n += 1; }
    return { ok: true, title: `${n} documents submitted.`, text: 'Each waits for someone other than its submitter to review it.' }; });
  const reviewDocs = () => t.act(`Approving ${toReview.length} documents, one request each…`, async (): Promise<Said> => {
    let n = 0; for (const d of toReview) { const a = await t.call('POST', `/v1/rooms/${room}/documentation/${d.kind}/review`, { decision: 'APPROVED' }); if (!a.ok) return { ...t.refused(a, `the review of ${d.label}`), title: `Stopped at ${d.label} after ${n} approved (${a.status}).` }; n += 1; }
    return { ok: true, title: `${n} documents approved.`, text: 'None by the person who submitted it.' }; });
  const signDocs = (side: 'VENDOR' | 'INTERNAL') => t.act(`Signing the packet for the ${side === 'VENDOR' ? 'integrator' : 'owner'}…`, async (): Promise<Said> => {
    const a = await t.call('POST', `/v1/rooms/${room}/documentation/sign/${side}`); if (!a.ok) return t.refused(a, 'the signature');
    return { ok: true, title: `Signed for the ${side === 'VENDOR' ? 'integrator' : 'owner'}.`, text: 'Over the packet as it stands. A document changed after this leaves the signature on the packet it signed.' }; });
  const sig = (side: string) => matrix?.signatures.filter((x) => x.side === side).slice(-1)[0];
  const btn = (id: string, label: string, onClick: () => void, primary = false, disabled = false, extra: Record<string, string> = {}) => <button type="button" className={`ui-btn ui-btn--sm${primary ? ' ui-btn--primary' : ''}`} data-testid={id} disabled={t.busy || disabled} onClick={onClick} {...extra}>{label}</button>;

  if (lifecycle !== 'COMMISSIONING') return null;
  return (
    <Card icon="shield" title="To acceptance" sub={`${counts.recorded} of ${counts.applicable} checks have a result · ${counts.verified} independently verified`} testId="fl-finish-card">
      <h4 className="fl__h4">Documentation and handover</h4>
      <ul className="fl__list fn__docs" data-testid="fl-docs">{docs.map((r) => <li key={r.test_id} data-test={r.test_id} data-result={r.result}>
        <span><b>{r.label}</b> <span className="ui-muted">· recorded by {r.personas.join(', ')}</span></span>
        {passed(r) ? <Tag tone={r.result === 'PASS_VERIFIED' ? 'ok' : 'warn'}>{words(r.result)}</Tag> : <span className="fn__doc">
          <label className="ui-sr" htmlFor={`doc-${r.test_id}`}>What was handed over for {r.label}</label><input id={`doc-${r.test_id}`} type="text" value={notes[r.test_id] || ''} maxLength={400} placeholder="what was handed over" data-testid="fl-doc-note" data-test={r.test_id} onChange={(e: { target: { value: string } }) => setNotes((n) => ({ ...n, [r.test_id]: e.target.value }))} />
          {btn('fl-doc-record', `Record as the ${t.person}`, () => void record(r), false, !(notes[r.test_id] || '').trim(), { 'data-test': r.test_id })}</span>}</li>)}</ul>
      <p className="ui-meta">A written note stands in for each document and is uploaded as its evidence file. On a project the file itself is uploaded.</p>
      <h4 className="fl__h4">Every other check</h4>
      <p data-testid="fl-rest" data-count={rest.length}>{rest.length ? `${rest.length} checks have no passing result yet.` : 'Every other check has a passing result.'}{atBench.length ? ` ${atBench.length} more ${atBench.length === 1 ? 'has' : 'have'} a criterion and ${atBench.length === 1 ? 'is' : 'are'} measured at the bench, not recorded here.` : ''}</p>
      <p className="build__row">{btn('fl-pass-all', `Record ${rest.length} checks as passed, as the ${t.person}`, () => void passAll(), false, !rest.length)}{btn('fl-verify-all', `Verify ${toVerify.length} results as the ${t.person}`, () => void verifyAll(), false, !toVerify.length)}</p>
      <p className="ui-meta">Recording them at once is a shortcut of the demonstration and says so in the evidence: one synthetic observation note, one request for each check. Verification is one request for each result, and the server refuses the person who recorded it.</p>
      <h4 className="fl__h4">Documentation and submission</h4>
      {matrix ? <div data-testid="fl-doc-matrix" data-required={matrix.status.required} data-approved={matrix.status.approved} data-percent={matrix.status.percent} data-complete={matrix.status.complete ? 'yes' : 'no'}>
        <p><b>{matrix.status.approved} of {matrix.status.required}</b> required documents approved ({matrix.status.percent}%). What this room requires follows from what it contains.</p>
        <ul className="fl__list fn__docs">{req.map((d) => { const v = last(d); return <li key={d.kind} data-kind={d.kind} data-state={v?.state || 'NONE'}>
          <span><b>{d.label}</b>{v ? <span className="ui-muted"> · version {v.version}, {v.fileName}</span> : null}{v?.state === 'REJECTED' && v.reviewNote ? <span className="ui-muted"> · rejected: {v.reviewNote}</span> : null}</span>
          <Tag tone={v?.state === 'APPROVED' ? 'ok' : v?.state === 'REJECTED' ? 'bad' : v ? 'warn' : 'muted'}>{v ? words(v.state) : 'not submitted'}</Tag></li>; })}</ul>
        <p className="build__row">{btn('fl-doc-submit-all', `Submit ${toSubmit.length} documents as the ${t.person}`, () => void submitDocs(), false, !toSubmit.length)}{btn('fl-doc-approve-all', `Approve ${toReview.length} documents as the ${t.person}`, () => void reviewDocs(), false, !toReview.length)}</p>
        <ul className="fl__list" data-testid="fl-doc-signatures">{(['VENDOR', 'INTERNAL'] as const).map((side) => { const g = sig(side); return <li key={side} data-side={side} data-current={g?.current ? 'yes' : 'no'}>
          <span><b>{side === 'VENDOR' ? 'The integrator' : 'The owner'}</b> <span className="ui-muted">{g ? `${g.current ? 'signed' : 'signed an earlier packet'}: ${g.name || g.role}, ${new Date(g.at).toLocaleString()}` : 'not signed'}</span></span>
          {g?.current ? <Tag tone="ok">signed</Tag> : btn(side === 'VENDOR' ? 'fl-doc-sign-vendor' : 'fl-doc-sign-internal', `Sign as the ${t.person}`, () => void signDocs(side))}</li>; })}</ul>
        <p className="ui-meta">A written note stands in for each document here. The server refuses a review by the submitter, a signature before every document is approved, and one person signing for both sides.</p>
      </div> : <p className="ui-muted">The documentation could not be read as this person.</p>}
      <h4 className="fl__h4">Sign-off</h4>
      <p data-testid="fl-ready" data-ready={allVerified && matrix?.status.complete ? 'yes' : 'no'}>{allVerified ? `Every applicable check is passed and independently verified.${matrix?.status.complete ? ' The documentation is approved and signed.' : ' The documentation is not yet approved and signed.'}` : `${rows.filter((r) => r.result !== 'PASS_VERIFIED').length} checks are not yet passed and independently verified. You can still ask: the server says what is in the way.`}</p>
      <p className="build__row">{btn('fl-lend', `Lend the acceptance to the operations lead, as the ${t.person}`, () => void lend())}{btn('fl-accept', `Accept the room as the ${t.person}`, () => void accept(), true)}</p>
    </Card>
  );
}

export function BaselineCard({ baseline, revision, names }: { baseline: Baseline | null; revision: number | null; names: Record<string, string> }) {
  const moved = baseline ? baseline.devices.filter((d) => d.placement?.asBuilt) : [];
  return (
    <Card icon="shield" title="Assurance: the accepted baseline" sub={baseline ? `Baseline ${baseline.version}, published ${new Date(baseline.published_at).toLocaleString()} by ${baseline.published_by_name}` : 'None yet: the room is not accepted'} testId="fl-baseline-card">
      {baseline ? <div data-testid="fl-baseline" data-version={baseline.version}>
        <dl className="san__defs">
          <div><dt>The design</dt><dd data-testid="fl-bl-design">revision {baseline.design_revision} <span className="ui-mono ui-muted">sha256 {baseline.design_sha256.slice(0, 16)}…</span>{revision !== null && revision === baseline.design_revision ? ' · the room’s approved revision, unchanged' : ''}</dd></div>
          <div><dt>Results</dt><dd data-testid="fl-bl-results" data-verified={Object.values(baseline.results).filter((x) => x === 'PASS_VERIFIED').length}>{Object.values(baseline.results).filter((x) => x === 'PASS_VERIFIED').length} passed and independently verified, on {baseline.evidence_ids.length} evidence files</dd></div>
          <div><dt>Why</dt><dd>{baseline.reason}</dd></div>
        </dl>
        <h4 className="fl__h4">Measured values it was accepted on</h4>
        {baseline.measurements.length ? <div className="fl__tablewrap"><table className="ui-table" data-testid="fl-bl-measured"><thead><tr><th scope="col">Test</th><th scope="col">Value</th><th scope="col">Judged against</th><th scope="col">Provenance</th></tr></thead>
          <tbody>{baseline.measurements.map((m) => <tr key={m.test} data-test={m.test} data-value={m.value}><th scope="row">{names[m.test] || words(m.test)}</th><td>{m.value} {m.unit} <span className="ui-muted">{m.metric}</span></td>
            <td>{m.criterion ? <>{limit(m.criterion, m.unit)} <span className="ui-muted">version {m.criterion.version}, {m.criterion.source}</span></> : 'no criterion'}</td><td><Tag tone={m.provenance === 'FIELD_MEASURED' ? 'ok' : 'warn'}>{words(m.provenance)}</Tag></td></tr>)}</tbody></table></div> : <p>No result of this baseline rests on a measurement.</p>}
        <h4 className="fl__h4">Where each device was</h4>
        <div className="fl__tablewrap"><table className="ui-table" data-testid="fl-bl-places"><thead><tr><th scope="col">Device</th><th scope="col">Designed</th><th scope="col">As built</th><th scope="col">In this baseline</th></tr></thead>
          <tbody>{baseline.devices.map((d) => <tr key={d.id} data-device={d.id} data-basis={d.placement?.basis || ''}><th scope="row">{d.label} <span className="ui-mono ui-muted">{d.id}</span></th><td data-col="designed">{d.placement ? at(d.placement.designed) : 'not recorded'}</td>
            <td data-col="built">{d.placement?.asBuilt ? <>{at(d.placement.asBuilt)} <span className="ui-muted">{d.placement.asBuilt.move}</span></> : <span className="ui-muted">as designed</span>}</td>
            <td data-col="at">{d.placement ? <>{at(d.placement.at)} <Tag tone={d.placement.basis === 'AS_BUILT' ? 'ok' : 'muted'}>{d.placement.basis === 'AS_BUILT' ? 'as built' : 'as designed'}</Tag></> : 'not recorded'}</td></tr>)}</tbody></table></div>
        <p className="ui-meta">Three records, none written over another: the design ({baseline.devices.length} device positions at revision {baseline.design_revision}), the installation’s approved moves ({moved.length} device{moved.length === 1 ? '' : 's'} moved), and this baseline, which the database does not let anyone change.</p>
      </div> : <p data-testid="fl-baseline-none">A baseline is published by the server when the room is accepted. Until then Assurance has nothing to compare the room against, and says so.</p>}
    </Card>
  );
}
