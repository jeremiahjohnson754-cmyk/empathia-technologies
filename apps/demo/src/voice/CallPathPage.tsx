/**
 * #/voice/callpath/<room> — the CallPath Digital Twin of one room (J6B-VOICE steps 2 to 4). The configured path, what was observed
 * on each hop, the session's quality samples with their method, the shared uplink (the edge FLOW reads), and a hypothesis with its
 * citations and unknowns. Three cases live in the address (?case=): a degraded call, missing provider telemetry, stale samples.
 * A hop with no observation says UNKNOWN. Nothing on this page is a live network, a real call or a real provider.
 * What a perspective sees is decided by the registry (voice.signalling): a technician reads the path without signalling-side detail.
 */
import { PageHero, Notice, Tag, Segmented, Card } from '@empathia/ui';
import { Connected } from '../mission/Connected.js';
import type { PageProps } from '../registry.types.js';
import { canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { buildingByKey, fullName, roomById, roomHref } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { jobView } from './job.js';
import { RoomJumps, opensFor } from '../rooms/RoomJumps.js';
import { CASES, VOICE_ROOM, LAYER_LABEL, METHOD, POLICY, SESSION, SHARED_LINK, FIXTURE_NOW, ageS, caseOf, caseView, estimate, flowFor, outsidePolicy, loadReports, type EvidenceState, type CaseId } from './model.js';

const TONE: Record<EvidenceState, 'ok' | 'warn' | 'bad' | 'info' | 'muted' | 'accent'> = { DECLARED: 'info', MODELED: 'info', SIMULATED: 'accent', OBSERVED: 'ok', MEASURED: 'ok', VERIFIED: 'ok', UNKNOWN: 'warn', NOT_CONFIGURED: 'bad', STALE: 'warn' };
const WORD: Record<EvidenceState, string> = { DECLARED: 'Declared', MODELED: 'Modeled', SIMULATED: 'Simulated', OBSERVED: 'Observed', MEASURED: 'Measured', VERIFIED: 'Verified', UNKNOWN: 'Unknown', NOT_CONFIGURED: 'Not configured', STALE: 'Stale' };
export const State = ({ s }: { s: EvidenceState }) => <Tag tone={TONE[s]}>{WORD[s]}</Tag>;
const hhmmss = (iso: string) => iso.slice(11, 19);
const ago = (iso?: string) => { if (!iso) return ''; const s = ageS(iso); return s < 3600 ? `${Math.round(s / 60)} min before the fixture clock` : s < 172800 ? `${Math.round(s / 3600)} h before the fixture clock` : `${iso.slice(0, 10)}`; };

export default function CallPathPage({ role, params, query, sees }: PageProps) {
  const room = roomById(params['room'] || ''); const id: CaseId = caseOf(query.get('case')); const { w } = useWorkspace();
  const opens = (h: string) => { const r = resolve(h); return !!r && canOpen(role, r); };
  const flow = room ? flowFor(room.id) : null;
  if (!room || !flow) {
    return (<>
      <PageHero eyebrow="VOICE · CallPath Digital Twin" title={room ? `No call flow is recorded for ${fullName(room)}` : 'This room is not in the estate'} lede="The demonstration holds call-flow records for two rooms. A room without a record is not shown as healthy: there is simply nothing to read." product="pro" icon="network" />
    <Connected id="voice" role={role} />
      <Notice tone="warn"><span data-testid="voice-noflow">Call flow: <b>Not configured</b> for this room.</span> <a href={`#/voice/callpath/${VOICE_ROOM}`}>Open the CallPath of Atlas 4.218</a></Notice>
    </>);
  }
  const v = caseView(id, room.id); const FLOW = v.flow; const b = buildingByKey(room.building)!; const admin = sees('voice.signalling');
  const job = jobView(w, room.id); const inc = job?.incident.id || loadReports().find((r) => r.roomId === room.id && r.incidentId)?.incidentId || null;
  const here = `#/voice/callpath/${room.id}`; const withCase = (c: CaseId) => (c === 'degraded' ? here : `${here}?case=${c}`);
  return (<div className="vc" data-testid="voice-callpath" data-case={id}>
    <nav className="vc-crumb" aria-label="Where this is"><a href="#/campus">North campus</a><span aria-hidden="true">›</span><a href={`#/campus/${b.key}`}>{b.name}</a><span aria-hidden="true">›</span><span>Floor {room.floor}</span><span aria-hidden="true">›</span><a href={roomHref(room)} data-testid="voice-room">{fullName(room)}</a></nav>
    <PageHero eyebrow="VOICE · CallPath Digital Twin · simulation" title={`CallPath: ${fullName(room)}`} product="pro" icon="network"
      lede="How a call from this room is meant to travel, what was observed on each hop of one session, and what is not known. Every value is synthetic."
      meta={[<span key="f">Call flow <b>{FLOW.id}</b></span>, <span key="c">Fixture clock <b>{FIXTURE_NOW.slice(0, 16).replace('T', ' ')} UTC</b></span>, <State key="s" s="SIMULATED" />]} />
    <Connected id="voice" role={role} />
    {/* the room's places in the other products, the same row every room page carries (rooms/RoomJumps.tsx): the CallPath is one of them */}
    <RoomJumps roomId={room.id} here="voice" opens={opensFor(role)} />
    <Notice tone="info"><b>Simulation.</b> No real call, network, carrier or provider is read. {admin ? SESSION.privacy : 'Session and signalling detail are not shown in this perspective.'}</Notice>
    {!v.observed ? <Notice tone="warn"><span data-testid="voice-configured-only"><b>Configured only.</b> This room has a declared call flow and no observed session. Nothing below says how its calls sound.</span></Notice> : null}
    {v.observed ? <div className="vc-cases"><Segmented label="Which case to show" value={id} onChange={(c) => { location.hash = withCase(c); }} options={CASES.map((c) => ({ value: c.id, label: c.label }))} /><p className="ui-muted" data-testid="voice-case-says">{CASES.find((c) => c.id === id)!.says}</p></div> : null}

    <section aria-labelledby="vc-path-h" className="vc-sec">
      <h2 id="vc-path-h">The path, hop by hop</h2>
      <p className="ui-muted">Configured is a declared record. Observed is what a source reported for this session. They are different claims, and each names its source.</p>
      <ol className="vc-path" data-testid="voice-path">{v.hops.map((h, i) => (
        <li key={h.id} className={`vc-hop vc-hop--${h.observed.state.toLowerCase()}`} data-hop={h.layer} data-observed={h.observed.state}>
          <div className="vc-hop__n" aria-hidden="true">{i + 1}</div>
          <div className="vc-hop__b">
            <p className="vc-hop__layer">{LAYER_LABEL[h.layer]}</p>
            <h3>{h.estate && opens('#/search') ? <a href={`#/search?focus=${h.estate.type}:${h.estate.id}`}>{h.label}</a> : h.label}</h3>
            <dl>
              <div><dt>Configured</dt><dd><State s={h.configured.state} /> {h.configured.source}</dd></div>
              <div><dt>Observed</dt><dd><State s={h.observed.state} /> {h.observed.source}{h.observed.at ? <span className="ui-muted"> · {ago(h.observed.at)}</span> : null}</dd></div>
              {admin && h.admin ? <div data-testid="voice-admin-detail"><dt>Administration</dt><dd>{h.admin}</dd></div> : null}
            </dl>
          </div>
        </li>))}</ol>
    </section>

    <section aria-labelledby="vc-q-h" className="vc-sec">
      <h2 id="vc-q-h">Call quality for this session</h2>
      <p data-testid="voice-verdict" data-verdict={v.verdict} className={`vc-verdict vc-verdict--${v.verdict.toLowerCase()}`}><b>{v.verdict === 'OUTSIDE_POLICY' ? 'Outside the declared targets' : v.verdict === 'WITHIN_POLICY' ? 'Within the declared targets' : 'Unknown'}</b> {v.verdictWhy}</p>
      {admin && v.observed ? <p className="ui-muted">Session <b data-testid="voice-session">{SESSION.token}</b> · {SESSION.label} · started {hhmmss(SESSION.startedAt)} UTC</p> : null}
      {v.samples.length ? <div className="ui-table-wrap vc-samples-wrap"><table className="ui-table vc-samples" data-testid="voice-samples">
        <caption className="ui-sr">Quality samples, ten-second windows: loss, jitter and delay as reported, then an experimental estimate</caption>
        <thead><tr><th scope="col">Window (UTC)</th><th scope="col">Loss</th><th scope="col">Jitter</th><th scope="col">One-way delay</th><th scope="col">Against {POLICY.id}</th><th scope="col">State</th><th scope="col">Estimate <span className="vc-exp">experimental</span></th></tr></thead>
        <tbody>{v.samples.map((s) => { const e = estimate(s); const out = outsidePolicy(s); return (
          <tr key={s.at} data-out={out.length ? '1' : '0'}><th scope="row">{hhmmss(s.at)} <span className="ui-muted">+{s.windowS} s</span></th><td data-l="Loss">{s.lossPct} %</td><td data-l="Jitter">{s.jitterMs} ms</td><td data-l="One-way delay">{s.oneWayDelayMs} ms</td>
            <td data-l={`Against ${POLICY.id}`}>{s.state === 'STALE' ? <span className="ui-muted">not judged (stale)</span> : out.length ? <span className="vc-out">{out.join('; ')}</span> : 'within targets'}</td>
            <td data-l="State"><State s={s.state} /></td>
            <td data-l="Estimate (experimental)" data-testid="voice-mos">{e.ok ? <span className="ui-muted">MOS {e.mos.toFixed(2)} (R {e.r})</span> : <span className="ui-muted" title={e.why}>no estimate</span>}</td></tr>); })}</tbody>
      </table></div> : v.observed ? <Notice tone="warn"><span data-testid="voice-nosamples">No quality samples exist for this session. A missing record is not a good call.</span></Notice> : null}
      {v.samples.length ? <p className="ui-muted" data-testid="voice-exp-note">Loss, jitter and delay are the reported values. The estimate is experimental: an engineering-review implementation that has not been independently validated, and it is not used for the verdict above.</p> : null}
      <details className="vc-method"><summary>How the estimate is made, and what it leaves out</summary>
        <p><b>{METHOD.id}</b>: {METHOD.name}. <State s="SIMULATED" /> inputs give a simulated estimate, never a measurement.</p>
        <p data-testid="voice-method-status"><b>{METHOD.status}.</b></p>
        <p>Inputs: {METHOD.inputs.join('; ')}. Assumed: jitter buffer {METHOD.assumptions.jitterBufferMs} ms, packetisation {METHOD.assumptions.packetisationMs} ms, random loss.</p>
        <p>Not counted: {METHOD.notCounted.join(', ')}. A codec without recorded constants, a missing input or a stale sample gets no estimate.</p>
        <p>Targets: {POLICY.source}</p>
      </details>
    </section>

    {v.observed ? <section aria-label="The shared uplink and the hypothesis" className="vc-sec vc-two">
      <Card title="The shared uplink" sub="The network edge FLOW reads" icon="network" testId="voice-shared">
        <p>Access switch <b>{SHARED_LINK.to}</b> reaches the building through <b>{SHARED_LINK.from}</b>. Three rooms depend on that uplink:</p>
        <ul className="vc-rooms">{SHARED_LINK.rooms.map((r) => { const o = roomById(r); return <li key={r}>{o ? <a href={r === room.id ? roomHref(o) : `#/voice/callpath/${r}`}>{fullName(o)}</a> : r}{r === room.id ? <span className="ui-muted"> (this room)</span> : null}</li>; })}</ul>
        <p className="ui-muted">{SHARED_LINK.source}</p>
        {opens('#/search') ? <p><a href={`#/search?focus=NetworkNode:${SHARED_LINK.to}`} data-testid="voice-to-graph">Open this switch and everything it feeds in Search Party</a></p> : null}
        {opens(`#/flow/link/${SHARED_LINK.to}`) ? <p><a href={`#/flow/link/${SHARED_LINK.to}?from=voice&room=${room.id}${id === 'degraded' ? '' : `&case=${id}`}`} data-testid="voice-to-flow">Open this uplink in FLOW: what depends on it, layer by layer</a></p> : null}
      </Card>
      <Card title={v.hypothesis ? 'A hypothesis, not a root cause' : 'No hypothesis'} sub="What Pro and APEX may record from this evidence" icon="spark" testId="voice-hypothesis">
        {v.hypothesis ? <>
          <p><b>{v.hypothesis.id}.</b> {v.hypothesis.statement}</p>
          <h4>It rests on</h4><ul>{v.hypothesis.cites.map((c) => <li key={c}>{c}</li>)}</ul>
          <h4>Not known</h4><ul>{v.hypothesis.unknowns.map((c) => <li key={c}>{c}</li>)}</ul>
          <p className="ui-muted">{v.hypothesis.wouldChange}</p>
        </> : <p data-testid="voice-nohyp">There is not enough evidence to suggest a cause. Nothing is inferred from a missing or stale record.</p>}
        <p className="ui-muted">{v.downstream}</p>
      </Card>
    </section> : null}

    {v.observed ? <section aria-labelledby="vc-job-h" className="vc-sec" data-testid="voice-job" data-verified={job?.verified ? '1' : '0'}>
      <h2 id="vc-job-h">The job</h2>
      {job ? <>
        <ol className="vc-job">{job.steps.map((st) => <li key={st.key} data-step={st.key} data-done={st.done ? '1' : '0'}><span><b>{st.label}</b> <span className="ui-muted">{st.detail}</span></span></li>)}</ol>
        <p data-testid="voice-job-says">{job.says}</p>
        <p className="ui-muted">These steps are ServiceHands’ own: its service machine assigns, takes field evidence and requires a reviewer who is not the technician. VOICE only reads the record.</p>
      </> : <p className="ui-muted" data-testid="voice-nojob">No calling problem has been reported for this room, so there is no job.</p>}
    </section> : null}
    <section aria-labelledby="vc-next-h" className="vc-sec">
      <h2 id="vc-next-h">From here</h2>
      <ul className="vc-next">
        {inc && opens('#/servicehands') ? <li><a href="#/servicehands" data-testid="voice-to-service">ServiceHands: {inc}, the job raised from this room’s report</a></li> : opens(`#/voice/report/${room.id}`) ? <li><a href={`#/voice/report/${room.id}`} data-testid="voice-to-report">Report a calling problem in this room</a> <span className="ui-muted">(no report from this browser yet)</span></li> : <li className="ui-muted">No calling problem has been reported from this browser for this room.</li>}
        {inc && opens('#/v25/apex') ? <li><a href={`#/v25/apex?incident=${inc}`}>APEX: the diagnosis record for {inc}</a></li> : null}
        {opens(`#/assurance/room/${room.id}`) ? <li><a href={`#/assurance/room/${room.id}`} data-testid="voice-to-assurance">Assurance: this room’s accepted baseline</a> <span className="ui-muted">(a closed job does not pass an acceptance test)</span></li> : null}
        {opens('#/people') ? <li><a href="#/people">Search Party: who looks after this site</a></li> : null}
        <li><a href="#/voice">VOICE overview and the adapter register</a></li>
      </ul>
      {opens('#/missionproof') ? <p><a href={`#/missionproof${id === 'degraded' ? '' : `?case=${id}`}`} data-testid="voice-to-mission">MissionProof: what this means for the town hall</a></p> : null}
    </section>
  </div>);
}
