/**
 * Field Intelligence (P7) in the enterprise application, over the API on @empathia/field-intelligence.
 *   Plan (v1.3): a room's declarations and procedures, PLAN_ONLY — nothing executed.
 *   Physical Validation (v1.4): licences per site × archetype, sessions proposed by systems engineering, the five-step safety preflight
 *   by different authorities, dry run, authorization, two-confirmation arming by the consenting operator, a labelled simulated run with
 *   scripted abnormal branches, E-stop. The page shows a step only when the API says the caller may take it; the API decides again.
 */
import { useState } from 'react';
import { Button, DataTable, Empty, ErrorState, Facts, Field, Loading, Notice, Tabs, Tag, type Column } from '@empathia/ui';
import { api, newKey, useMutation, useQuery } from '../api.js';
import { useMe } from '../me.js';
import { href } from '../router.js';

type Tone = 'ok' | 'warn' | 'bad' | 'muted' | 'info';
const call = (op: string, args: Record<string, unknown> = {}) => api.call(op as never, args as never) as Promise<unknown>;
const when = (s: string | null | undefined) => (s ? s.slice(0, 16).replace('T', ' ') : '—');
interface Lic { sites: Array<{ code: string; name: string; licences: Array<{ archetype: string; granted: boolean; note: string | null; by: string | null; at: string | null; policy: string; tier: string }> }>; mayGrant: boolean; adapters: Array<{ id: string; family: string; label: string; tier: string; note: string }> }
interface Row { code: string; room: { code: string; name: string }; archetype: string; state: string; terminal: boolean; simulated: boolean; points: number; tests: number; createdBy: string; createdAt: string }
interface Sess { code: string; room: { code: string; name: string }; state: string; terminal: boolean; createdBy: string; createdAt: string; stepLabel: string; missing?: string[];
  session: { archetype: string; points: Array<{ id: string; label: string }>; tests: Array<{ id: string; label: string; adapter: string; state?: string }>; protocol: { name: string; maxDurationMin: number }; safety: { occupancy: string; privacyNotice: boolean; localOperator: string | null; emergencyStop: string; levelLimit: number | null; rollback: string }; instrument: { model: string; serial: string; calibrationId: string; calibrationDue: string } | null; approvals: Record<string, { by: string; at: string } | undefined>; eligibility: { eligibleTests: string[]; notConfigured: string[] } | null; dryRun: { preview: Array<{ point: string; tests: string[]; level: string; durationS: number }>; output: string } | null; results: Array<{ point: string; test: string; outcome: string; value: number | null; unit: string; simulated: boolean; note?: string }>; log: Array<{ at: string; state: string; text: string; by: string }>; exits: Array<{ at: string; from: string; exit: string; why: string }>; restore: string | null; simulated: boolean };
  yours: Record<string, boolean>; branches: string[]; adapters: Lic['adapters'] }
const TONE: Record<string, Tone> = { DRAFT: 'muted', SAFETY_PREFLIGHT: 'info', DRY_RUN: 'info', APPROVAL_PENDING: 'warn', ARMED: 'warn', RUNNING: 'warn', ACQUIRED: 'ok', APPROVED: 'ok' };
const tone = (s: string): Tone => TONE[s] || (/NOT_|OCCUPIED|OUT_OF|FAILED|ABORTED|TIMED|FAULT|INCONCLUSIVE|AWAITING/.test(s) ? 'bad' : 'muted');
const ADP: Record<string, Tone> = { READ_ONLY: 'info', SUPPORTED_VERIFIED: 'ok', NOT_CONFIGURED: 'bad', PLAN_ONLY: 'muted', NOT_SUPPORTED: 'bad' };

export function FieldHome({ tab }: { tab: string }) {
  return (
    <section className="page">
      <header className="page__head"><div><p className="kicker">Field Intelligence</p><h1>Declared today, validated only when licensed, gated and witnessed</h1><p className="ui-meta">v1.3 plans execute nothing. v1.4 Physical Validation needs a licence, five independent approvals, a dry run, the commissioning lead and a consenting operator — and in this build the only runs are labelled simulations.</p></div></header>
      <Tabs label="Field Intelligence" active={tab} onChange={(k) => { location.hash = href('field', k); }} tabs={[{ key: 'sessions', label: 'v1.4 sessions' }, { key: 'licences', label: 'Licences' }, { key: 'plan', label: 'v1.3 plan' }]} />
      {tab === 'licences' ? <Licences /> : tab === 'plan' ? <PlanPicker /> : <Sessions />}
    </section>
  );
}

function Licences() {
  const q = useQuery<Lic>('fi:licences', () => call('getV1FieldIntelligenceLicences') as Promise<Lic>);
  const set = useMutation((a: { siteCode: string; archetype: string; granted: boolean }) => call('postV1FieldIntelligenceLicences', { body: a }), ['fi:licences']);
  if (q.error) return <ErrorState error={q.error} retry={q.reload} />; if (!q.data) return <Loading />;
  return (
    <div className="stack" data-testid="fi-licences">
      <Notice tone="info">A licence opens requests, never proofs: without one the v1.3 plan and an independent qualified upload remain available. {q.data.mayGrant ? 'You may grant or revoke licences.' : 'Licences are changed by the security / platform administrator (license.grant).'}</Notice>
      {set.error ? <ErrorState error={set.error} /> : null}
      {q.data.sites.map((s) => <section key={s.code} className="card stack"><h2 className="h3">{s.name} <span className="ui-meta mono">{s.code}</span></h2>
        <ul className="plain">{s.licences.map((l) => <li key={l.archetype} className="cand"><Tag tone={l.granted ? 'ok' : 'muted'}>{l.granted ? 'LICENSED' : 'NOT LICENSED'}</Tag> <b>{l.archetype}</b> <span className="ui-meta">{l.policy} · tier {l.tier}{l.by ? ` · ${l.granted ? 'granted' : 'revoked'} by ${l.by} ${when(l.at)}` : ''}</span>{q.data!.mayGrant ? <Button small busy={set.busy} onClick={() => void set.run({ siteCode: s.code, archetype: l.archetype, granted: !l.granted })}>{l.granted ? 'Revoke' : 'Grant'}</Button> : null}</li>)}</ul></section>)}
      <section className="card stack"><h2 className="h3">Adapters in this build</h2><ul className="plain">{q.data.adapters.map((a) => <li key={a.id}><Tag tone={ADP[a.tier] || 'muted'}>{a.tier}</Tag> <b>{a.label}</b> <span className="ui-meta">{a.id} · {a.note}</span></li>)}</ul></section>
    </div>
  );
}

function PlanPicker() {
  const rooms = useQuery<{ items: Array<{ code: string; name: string }> }>('rooms:all', () => call('getV1Rooms', { query: { limit: '200' } }) as Promise<{ items: Array<{ code: string; name: string }> }>);
  const [room, setRoom] = useState('');
  const plan = useQuery<{ room: { code: string; name: string; archetype: string }; plan: { ScriptVersion: string; State: string; Devices: Array<{ AssetId: string; Name: string; Kind: string; Capabilities: Record<string, string>; ClaimDowngraded: string | null; Procedures: Array<{ Capability: string; State: string; Action: string; EvidenceKind: string; Executed: boolean }> }>; AudioPairs: Array<{ PairId: string; MicrophoneAssetId: string; SpeakerAssetId: string; Status: string }>; Monitoring: { ObservationState: string; CollectionIntervalMinutes: number; AllowedTargets: Array<{ AssetId: string; IcmpRequired: boolean }> } }; note: string }>(room ? `fi:plan:${room}` : null, () => call('getV1RoomsRoomFieldIntelligencePlan', { params: { room } }) as never);
  return (
    <div className="stack" data-testid="fi-plan">
      <Field label="Room">{(id) => <select id={id} value={room} onChange={(e) => setRoom(e.target.value)}><option value="">choose a room</option>{(rooms.data?.items || []).map((r) => <option key={r.code} value={r.code}>{r.name} · {r.code}</option>)}</select>}</Field>
      {plan.error ? <ErrorState error={plan.error} /> : null}
      {plan.data ? <>
        <Notice tone="muted"><b>{plan.data.plan.State}</b> · script {plan.data.plan.ScriptVersion} · {plan.data.room.archetype}. {plan.data.note}</Notice>
        <DataTable rows={plan.data.plan.Devices} rowKey={(d) => d.AssetId} caption="Devices" columns={[
          { key: 'a', header: 'Asset', render: (d) => <span><b>{d.Name}</b> <span className="ui-meta mono">{d.AssetId}</span></span> }, { key: 'k', header: 'Kind', render: (d) => d.Kind },
          { key: 'c', header: 'Capabilities', render: (d) => <span className="ui-meta">{Object.entries(d.Capabilities).map(([k, v]) => `${k} ${v}`).join(' · ')}</span> },
          { key: 'p', header: 'Procedures', render: (d) => <span className="ui-meta">{d.Procedures.length} planned · {d.Procedures.filter((p) => p.Executed).length} executed</span> },
          { key: 'd', header: '', render: (d) => d.ClaimDowngraded ? <Tag tone="warn">claim downgraded</Tag> : null },
        ] as Column<(typeof plan.data.plan.Devices)[number]>[]} />
        <div className="two"><section className="card stack"><h2 className="h3">Audio pairs</h2>{plan.data.plan.AudioPairs.length ? <ul className="plain">{plan.data.plan.AudioPairs.map((p) => <li key={p.PairId}><Tag tone="muted">{p.Status}</Tag> {p.MicrophoneAssetId} ↔ {p.SpeakerAssetId}</li>)}</ul> : <p className="ui-meta">No microphone/loudspeaker pair in this room.</p>}</section>
          <section className="card stack"><h2 className="h3">Monitoring</h2><Facts items={[['Observation state', plan.data.plan.Monitoring.ObservationState], ['Interval', `${plan.data.plan.Monitoring.CollectionIntervalMinutes} min`], ['Allowed targets', `${plan.data.plan.Monitoring.AllowedTargets.length} (${plan.data.plan.Monitoring.AllowedTargets.filter((t) => t.IcmpRequired).length} ICMP-required)`]]} /></section></div>
      </> : room ? <Loading label="Composing the plan" /> : <Empty title="Choose a room">The plan is composed from the room’s planned assets; nothing is executed.</Empty>}
    </div>
  );
}

function Sessions() {
  const q = useQuery<{ items: Row[] }>('fi:sessions', () => call('getV1FieldIntelligenceSessions') as Promise<{ items: Row[] }>);
  if (q.error) return <ErrorState error={q.error} retry={q.reload} />; if (!q.data) return <Loading />;
  const cols: Column<Row>[] = [
    { key: 'c', header: 'Session', render: (x) => <a href={href('field', 'sessions', x.code)} className="mono">{x.code}</a> },
    { key: 's', header: 'State', render: (x) => <Tag tone={tone(x.state)}>{x.state}</Tag> },
    { key: 'r', header: 'Room', render: (x) => <span>{x.room.name} <span className="ui-meta">{x.archetype}</span></span> },
    { key: 'n', header: 'Points · tests', render: (x) => `${x.points} · ${x.tests}` },
    { key: 'sim', header: '', render: (x) => x.simulated ? <Tag tone="warn">simulation</Tag> : null },
    { key: 'by', header: 'Proposed by', render: (x) => <span className="ui-meta">{x.createdBy} · {when(x.createdAt)}</span> },
  ];
  return <div className="stack" data-testid="fi-sessions"><DataTable rows={q.data.items} columns={cols} rowKey={(x) => x.code} caption="Sessions" empty={<Empty title="No session proposed">A session is proposed from a room (Field Intelligence tab on the room) by systems engineering.</Empty>} /></div>;
}

export function FiSession({ code }: { code: string }) {
  const key = `fi:session:${code}`;
  const q = useQuery<Sess>(key, () => call('getV1FieldIntelligenceSessionsSession', { params: { session: code } }) as Promise<Sess>);
  const act = useMutation((a: { op: string; body?: Record<string, unknown> }) => call(a.op, { params: { session: code }, ...(a.body ? { body: a.body } : {}) }), [key, 'fi:sessions']);
  const [f, setF] = useState<Record<string, string>>({});
  const v = (k: string, d = '') => f[k] ?? d; const set = (k: string) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value })); const on = (k: string) => v(k) === 'on'; const toggle = (k: string) => (e: { target: { checked: boolean } }) => setF((x) => ({ ...x, [k]: e.target.checked ? 'on' : '' }));
  if (q.error) return <section className="page"><ErrorState error={q.error} retry={q.reload} /></section>;
  if (!q.data) return <section className="page"><Loading label="Reading the session" /></section>;
  const S = q.data; const s = S.session; const y = S.yours;
  const go = (op: string, body?: Record<string, unknown>) => void act.run({ op, body });
  const pre = (body: Record<string, unknown>) => go('postV1FieldIntelligenceSessionsSessionPreflight', body);
  return (
    <section className="page" data-testid="fi-session">
      <header className="page__head"><div><p className="kicker"><a href={href('field', 'sessions')}>Sessions</a> · Physical Validation v1.4</p><h1>{S.code} · {S.room.name}</h1><p className="ui-meta">{s.archetype} · {s.protocol.name} · proposed by {S.createdBy} {when(S.createdAt)}</p></div>
        <div className="stack" data-testid="fi-state"><Tag tone={tone(S.state)}>{S.state}</Tag>{s.simulated ? <Tag tone="warn">SIMULATION</Tag> : null}{S.terminal ? <Tag tone="muted">ended</Tag> : null}</div></header>
      {act.error ? <ErrorState error={act.error} /> : null}
      <Facts items={[['Step', S.stepLabel], ['Points', s.points.map((p) => p.label).join(', ')], ['Tests', s.tests.map((t) => `${t.id} (${t.adapter}${t.state ? ` · ${t.state}` : ''})`).join(', ')], ['Safety', `occupancy ${s.safety.occupancy} · privacy notice ${s.safety.privacyNotice ? 'yes' : 'no'} · E-stop ${s.safety.emergencyStop} · level limit ${s.safety.levelLimit ?? '—'} dB(A) · rollback ${s.safety.rollback}`], ['Instrument', s.instrument ? `${s.instrument.model} ${s.instrument.serial} · calibration ${s.instrument.calibrationId} due ${s.instrument.calibrationDue}` : '—'], ['Approvals', Object.entries(s.approvals).filter(([, x]) => x).map(([k]) => k).join(', ') || 'none']]} />
      {S.missing?.length ? <Notice tone="warn">Still missing: {S.missing.join(', ')}.</Notice> : null}

      {!S.terminal ? <section className="card stack" data-testid="fi-actions"><h2 className="h3">Next</h2>
        {S.state === 'DRAFT' ? (y['eligibility'] ? <div><Button kind="primary" busy={act.busy} onClick={() => go('postV1FieldIntelligenceSessionsSessionEligibility')}>Check eligibility (licence and adapters)</Button></div> : <p className="ui-meta">Eligibility is checked by systems engineering or the commissioning lead.</p>) : null}
        {S.state === 'SAFETY_PREFLIGHT' ? <div className="stack">
          {!s.approvals['protocol'] && y['protocol'] ? <div className="row-actions"><Field label="Site-approved level limit, dB(A)">{(i) => <input id={i} type="number" min={1} value={v('limit', '85')} onChange={set('limit')} />}</Field><Button small busy={act.busy} onClick={() => pre({ step: 'protocol', levelLimit: Number(v('limit', '85')) })}>Approve the protocol</Button></div> : null}
          {!s.approvals['window'] && y['window'] ? <div className="row-actions"><label className="check"><input type="checkbox" checked={on('occ')} onChange={toggle('occ')} /> The room is occupied</label><label className="check"><input type="checkbox" checked={on('priv')} onChange={toggle('priv')} /> Privacy notice posted</label><Button small busy={act.busy} onClick={() => pre({ step: 'window', occupied: on('occ'), privacyNotice: on('priv') })}>Reserve the window</Button></div> : null}
          {!s.approvals['operator'] && y['operator'] ? <div className="row-actions"><label className="check"><input type="checkbox" checked={on('present')} onChange={toggle('present')} /> I am present on site</label><label className="check"><input type="checkbox" checked={on('qual')} onChange={toggle('qual')} /> I am qualified for this protocol</label><Button small busy={act.busy} onClick={() => pre({ step: 'operator', present: on('present'), qualified: on('qual'), mfa: true })}>Consent as local operator</Button></div> : null}
          {!s.instrument && y['instrument'] ? <div className="row-actions"><Field label="Instrument model">{(i) => <input id={i} value={v('model')} onChange={set('model')} />}</Field><Field label="Serial">{(i) => <input id={i} value={v('serial')} onChange={set('serial')} />}</Field><Field label="Calibration id">{(i) => <input id={i} value={v('cal')} onChange={set('cal')} />}</Field><Field label="Calibration due">{(i) => <input id={i} type="date" value={v('due')} onChange={set('due')} />}</Field><Button small busy={act.busy} onClick={() => pre({ step: 'instrument', instrument: { model: v('model'), serial: v('serial'), calibrationId: v('cal'), calibrationDue: v('due') } })}>Register the instrument</Button></div> : null}
          {s.safety.emergencyStop !== 'VERIFIED_LOCAL' && y['operator'] ? <div className="row-actions"><label className="check"><input type="checkbox" checked={on('estop')} onChange={toggle('estop')} /> I tested the emergency stop locally</label><Button small busy={act.busy} onClick={() => pre({ step: 'estop', verified: on('estop') })}>Verify the E-stop</Button></div> : null}
        </div> : null}
        {S.state === 'DRY_RUN' ? (y['dryRun'] ? <div><Button kind="primary" busy={act.busy} onClick={() => go('postV1FieldIntelligenceSessionsSessionDryRun')}>Dry run (emits nothing)</Button></div> : <p className="ui-meta">The dry run is walked by the operator.</p>) : null}
        {S.state === 'APPROVAL_PENDING' && !s.approvals['session'] ? (y['authorize'] ? <div className="row-actions"><Button kind="primary" busy={act.busy} onClick={() => go('postV1FieldIntelligenceSessionsSessionAuthorize', { yes: true })}>Authorize the session</Button><Button busy={act.busy} onClick={() => go('postV1FieldIntelligenceSessionsSessionAuthorize', { yes: false })}>Refuse</Button></div> : <p className="ui-meta">Awaiting the commissioning lead’s authorization.</p>) : null}
        {S.state === 'APPROVAL_PENDING' && s.approvals['session'] ? (y['arm'] ? <div className="stack" data-testid="fi-arm"><label className="check"><input type="checkbox" checked={on('c1')} onChange={toggle('c1')} /> I confirm the room is unoccupied and the protocol limits apply</label><label className="check"><input type="checkbox" checked={on('c2')} onChange={toggle('c2')} /> I confirm I will stay at the emergency stop for the whole run</label><label className="check"><input type="checkbox" checked={on('real')} onChange={toggle('real')} /> Ask for a real run (this build has no configured adapter: the honest answer is NOT_CONFIGURED)</label><Button kind="primary" busy={act.busy} onClick={() => go('postV1FieldIntelligenceSessionsSessionArm', { confirm1: on('c1'), confirm2: on('c2'), real: on('real') })}>Arm</Button></div> : <p className="ui-meta">Authorized. Only the consenting local operator can arm, with two confirmations.</p>) : null}
        {S.state === 'ACQUIRED' ? <Notice tone="ok">All points acquired (simulated). Next: the instrument export is submitted for review; the simulator records no values, so there is nothing to approve here.</Notice> : null}
        {['ARMED', 'RUNNING'].includes(S.state) ? <div className="row-actions" data-testid="fi-run"><Button kind="primary" busy={act.busy} onClick={() => go('postV1FieldIntelligenceSessionsSessionRun', {})}>{S.state === 'ARMED' ? 'Start the simulated run' : 'Next point'}</Button><label className="ui-meta">Scripted branch <select value={v('branch')} onChange={set('branch')}><option value="">nominal</option>{S.branches.map((b) => <option key={b} value={b}>{b}</option>)}</select></label>{v('branch') ? <Button busy={act.busy} onClick={() => go('postV1FieldIntelligenceSessionsSessionRun', { branch: v('branch') })}>Inject {v('branch')}</Button> : null}<Button kind="danger" busy={act.busy} onClick={() => go('postV1FieldIntelligenceSessionsSessionEstop')}>EMERGENCY STOP</Button></div> : null}
      </section> : <Notice tone={S.state === 'ACQUIRED' ? 'ok' : 'warn'}><b>{S.state}</b>{s.exits.length ? ` — ${s.exits[s.exits.length - 1]!.why}` : ''}{s.restore ? ` · restore: ${s.restore}` : ''}</Notice>}

      <div className="two">
        <section className="card stack" data-testid="fi-results"><h2 className="h3">Results {s.simulated ? <Tag tone="warn">simulated</Tag> : null}</h2>
          {s.dryRun ? <p className="ui-meta">Dry run: {s.dryRun.preview.length} points · {s.dryRun.output}</p> : null}
          {s.results.length ? <ul className="plain">{s.results.map((r, i) => <li key={i}><Tag tone={r.outcome === 'FAIL' ? 'bad' : 'muted'}>{r.outcome}</Tag> {r.point} · {r.test} · {r.value === null ? 'no value (simulator)' : `${r.value} ${r.unit}`}{r.note ? <span className="ui-meta"> · {r.note}</span> : null}</li>)}</ul> : <p className="ui-meta">No result.</p>}
        </section>
        <section className="card stack"><h2 className="h3">Log</h2><ul className="plain">{s.log.map((l, i) => <li key={i}><span className="ui-meta mono">{when(l.at)}</span> <Tag tone={tone(l.state)}>{l.state}</Tag> {l.text}</li>)}</ul>{s.exits.length ? <ul className="why">{s.exits.map((e, i) => <li key={i}>{e.from} → <b>{e.exit}</b>: {e.why}</li>)}</ul> : null}</section>
      </div>
    </section>
  );
}

/** The room's Field Intelligence tab: propose a v1.4 session (systems engineering) with the seats as points; the plan lives under Field Intelligence › v1.3 plan. */
export function RoomField({ code, archetype }: { code: string; archetype: string }) {
  const { can } = useMe();
  const q = useQuery<{ items: Row[] }>('fi:sessions', () => call('getV1FieldIntelligenceSessions') as Promise<{ items: Row[] }>);
  const propose = useMutation(() => call('postV1RoomsRoomFieldIntelligenceSessions', { params: { room: code }, idempotencyKey: newKey(), body: { points: [{ id: 'TP-1', label: 'seat row 1' }, { id: 'TP-2', label: 'seat row 3' }, { id: 'TP-3', label: 'far seat' }], tests: [{ id: 'LAEQ', label: 'LAeq at seats', adapter: 'ADP-SLM' }, { id: 'STIPA', label: 'STIPA at seats', adapter: 'ADP-STI' }, { id: 'CAM-FOV', label: 'Camera FOV / preset scan', adapter: 'ADP-CAM' }] } }), ['fi:sessions']);
  const mine = (q.data?.items || []).filter((x) => x.room.code === code);
  return (
    <div className="stack" data-testid="room-field">
      <Notice tone="info">v1.3 declarations for this room: <a href={href('field', 'plan')}>Field Intelligence › v1.3 plan</a>. v1.4 Physical Validation needs a licence for {archetype} rooms at this site, five approvals, a dry run, the commissioning lead and a consenting operator; in this build the only runs are labelled simulations.</Notice>
      {propose.error ? <ErrorState error={propose.error} /> : null}
      {mine.length ? <ul className="plain">{mine.map((x) => <li key={x.code}><Tag tone={tone(x.state)}>{x.state}</Tag> <a href={href('field', 'sessions', x.code)} className="mono">{x.code}</a> <span className="ui-meta">{x.points} points · {x.tests} tests · {x.createdBy}</span></li>)}</ul> : <p className="ui-meta">No session proposed for this room.</p>}
      {can(['plan.compile', 'protocol.approve']) ? <div><Button kind="primary" busy={propose.busy} onClick={async () => { const r = await propose.run(undefined); if (r) location.hash = href('field', 'sessions', (r as { sessionId: string }).sessionId); }}>Propose a Physical Validation session</Button></div> : null}
    </div>
  );
}
