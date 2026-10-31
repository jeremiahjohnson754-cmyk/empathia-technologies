/**
 * Field Intelligence — v1.3 (what the collector declares; the plan keeps every device pair NOT_TESTED with null measurements until
 * evidence arrives; passive monitoring is NOT_RUN in a browser) and the optional v1.4 Physical Validation session (licensed, gated,
 * simulated here: a licence opens requests, never proofs; preflight has blocked branches; arming needs two confirmations and a present
 * operator; every run is a labelled simulation with an E-stop; there is no "Scan Now"). Engine: @empathia/field-intelligence.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Facts, Notice, Tag, Tabs } from '@empathia/ui';
import { FI13, FIPV, composePlan, BRANCHES, type Session } from '@empathia/field-intelligence';
import { buildEstate } from '../search/estate.js';
import * as S from '../workspace/store.js';
import { useWorkspace, isRefusal } from '../workspace/useWorkspace.js';
import { personaOf, personaLabel, holds, loadDraft } from '../build/store.js';

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { DECLARED: 'muted', UNKNOWN: 'muted', OBSERVED: 'info', VERIFIED: 'ok', NOT_TESTED: 'muted', NOT_RUN: 'muted', PLAN_ONLY: 'info', SUPPORTED_VERIFIED: 'ok', READ_ONLY: 'info', PLAN_ONLY_: 'muted', NOT_SUPPORTED: 'bad', NOT_CONFIGURED: 'warn', ARMED: 'warn', RUNNING: 'warn', ACQUIRED: 'ok', APPROVAL_PENDING: 'info', DRY_RUN: 'info', SAFETY_PREFLIGHT: 'info', DRAFT: 'muted' };
const tone = (s: string): 'ok' | 'warn' | 'bad' | 'muted' | 'info' => TONE[s] || ((FIPV.exits as readonly string[]).includes(s) ? 'bad' : 'muted');
const when = (s: string) => s.slice(0, 16).replace('T', ' ');
const ROOMS: Array<[string, string, string]> = [['R-ATL-4-218', 'Atlas 4.218 Boardroom', 'BRD'], ['R-ATL-4-220', 'Atlas 4.220 Huddle', 'HUD'], ['R-NST-2-101', 'Northstar Town Hall', 'TWN']];

export function FieldIntelligencePage({ perspective, pv, hash }: { perspective: string; pv: boolean; hash: string }) {
  const persona = personaOf(perspective);
  const { w, apply, refusal } = useWorkspace();
  const est = useMemo(() => buildEstate(), []);
  const [roomId, setRoomId] = useState(/[?&]room=([A-Z0-9-]+)/.exec(hash)?.[1] || 'R-ATL-4-218');
  useEffect(() => { const r = /[?&]room=([A-Z0-9-]+)/.exec(hash)?.[1]; if (r && r !== roomId) setRoomId(r); }, [hash]); // the address is the source of truth for the room
  const draft = loadDraft();
  const devices = useMemo(() => { const d = draft && draft.code === roomId ? draft.design.devices.filter((x) => !x.furniture && !x.removed).map((x) => ({ id: x.id, name: x.label, category: x.cat })) : est.edges.filter((e) => e.rel === 'PLANS_DEVICE' && e.from.id === roomId).map((e) => { const n = est.nodes.find((x) => x.type === e.to.type && x.id === e.to.id)!; return { id: n.id, name: n.label, category: n.facets?.['category'] as string | undefined, claimsObserved: /touch/i.test(n.label) }; }); return d; }, [est, roomId, draft]);
  const plan = useMemo(() => composePlan(devices), [devices]);
  return (
    <section className="fi">
      <header className="build__head"><div><p className="kicker">Field Intelligence · {pv ? 'v1.4 Physical Validation (optional, licensed)' : 'v1.3 (included by default)'}</p><h1>{pv ? 'Licensed, gated, simulated here' : 'What the collector declares'}</h1>
        <p className="ui-muted">Acting as <b>{personaLabel(persona)}</b>. {pv ? 'A licence opens requests, never proofs. Preflight has blocked branches; arming needs two confirmations and a present operator; every run here is a labelled simulation with an E-stop. There is no "Scan Now".' : 'Capabilities are DECLARED until a run observes them; a plan is PLAN_ONLY with HardwareTested false. Passive monitoring is NOT_RUN in a browser. Nothing is promoted by wishful labelling.'}</p></div>
        <div className="build__state"><label className="ui-muted" htmlFor="fi-room">Room</label><select id="fi-room" value={roomId} onChange={(e) => setRoomId(e.target.value)}>{[...ROOMS, ...(draft ? [[draft.code, draft.name, 'HUD'] as [string, string, string]] : [])].map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></div></header>
      {refusal && <div role="alert"><Notice tone="bad"><b>Refused.</b><ul className="build__why">{refusal.why.map((x) => <li key={x}>{x}</li>)}</ul></Notice></div>}
      <Tabs label="Field Intelligence" active={pv ? 'pv' : 'plan'} onChange={(k) => { location.hash = k === 'pv' ? `#/v25/fipv?room=${roomId}` : `#/v25/fi?room=${roomId}`; }} tabs={[{ key: 'plan', label: 'v1.3 declarations and plan' }, { key: 'pv', label: 'v1.4 Physical Validation', count: w.fiSessions.length }]} />
      {!pv ? <PlanView plan={plan} /> : <PvView w={w} apply={apply} persona={persona} roomId={roomId} archetype={([...ROOMS].find((r) => r[0] === roomId)?.[2]) || 'HUD'} />}
    </section>
  );
}

function PlanView({ plan }: { plan: ReturnType<typeof composePlan> }) {
  return (
    <div className="stack" data-testid="fi-plan">
      <div className="card stack"><h2 className="build__h">The released collector, as integrated</h2>
        <Facts items={[['Script', `${FI13.scriptVersion} · plan schema ${FI13.schema} · config ${FI13.configSchema}`], ['Modes', FI13.modes.join(' · ')], ['Exit codes', Object.entries(FI13.exitCodes).map(([k, v]) => `${k} ${v}`).join(' · ')], ['Passive schedule', `every ${FI13.intervalMinutes} minutes, read-only reachability`], ['Package hashes', `sha256 ${FI13.sha256.slice(0, 16)}… (source ${FI13.sourceSha256.slice(0, 16)}…)`], ['Redistribution', FI13.redistribution], ['Verified', FI13.verified]]} />
        <ul className="plain">{FI13.limitations.map((l) => <li key={l}><Tag tone="warn">limitation</Tag> {l}</li>)}</ul></div>
      <div className="card stack"><h2 className="build__h">Plan vs executed <Tag tone="info">{plan.State}</Tag></h2>
        <p className="ui-meta">Every device keeps its capabilities DECLARED or UNKNOWN; nothing is executed. HardwareTested is false for every device.</p>
        <table className="build__table"><thead><tr><th>Device</th><th>Kind</th><th>Declared capabilities</th><th>Procedures (not executed)</th><th>Hardware tested</th></tr></thead><tbody>{plan.Devices.map((d) => <tr key={d.AssetId}><td><b>{d.Name}</b><div className="ui-meta mono">{d.AssetId}</div>{d.ClaimDowngraded && <div className="ui-meta"><Tag tone="warn">downgraded</Tag> {d.ClaimDowngraded}</div>}</td><td>{d.Kind}</td><td>{Object.entries(d.Capabilities).filter(([, s]) => s !== 'UNKNOWN').map(([k, s]) => <span key={k}><Tag tone={tone(s)}>{s}</Tag> {k} </span>)}{!Object.values(d.Capabilities).some((s) => s !== 'UNKNOWN') && <span className="ui-meta">all UNKNOWN</span>}</td><td className="ui-meta">{d.Procedures.map((p) => `${p.Capability}: ${p.Action}`).join('; ') || '—'}</td><td><Tag tone="muted">false</Tag></td></tr>)}</tbody></table>
        <h3 className="build__h">Device pairs</h3>
        {plan.AudioPairs.length ? <table className="build__table"><thead><tr><th>Pair</th><th>Microphone → loudspeaker</th><th>Status</th><th>SPL · RT60 · frequency response</th><th>Procedure</th></tr></thead><tbody>{plan.AudioPairs.map((p) => <tr key={p.PairId}><td className="mono">{p.PairId}</td><td className="mono">{p.MicrophoneAssetId} → {p.SpeakerAssetId}</td><td><Tag tone="muted">{p.Status}</Tag> <span className="ui-meta">{p.EvidenceKind}</span></td><td className="ui-meta">null · null · null</td><td className="ui-meta">{p.Procedure.join(' → ')}</td></tr>)}</tbody></table> : <p className="ui-meta">No microphone–loudspeaker pair in this room's device list.</p>}
      </div>
      <div className="card stack"><h2 className="build__h">Passive monitoring <Tag tone="muted">{plan.Monitoring.ObservationState}</Tag></h2>
        <Facts items={[['Mode', plan.Monitoring.Mode], ['Interval', `${plan.Monitoring.CollectionIntervalMinutes} minutes`], ['Last observation', 'none'], ['Note', plan.Monitoring.Note]]} />
        <ul className="plain">{plan.Monitoring.AllowedTargets.map((t) => <li key={t.AssetId}><Tag tone={t.Severity === 'CRITICAL' ? 'bad' : 'warn'}>{t.Severity}</Tag> <b>{t.Name}</b> <span className="ui-meta">ICMP{t.IcmpRequired ? ' required' : ''} · mandatory · last check: NOT_RUN</span></li>)}</ul>
      </div>
    </div>
  );
}

function PvView({ w, apply, persona, roomId, archetype }: { w: S.Workspace; apply: ReturnType<typeof useWorkspace>['apply']; persona: string; roomId: string; archetype: string }) {
  const [sel, setSel] = useState<string | null>(w.fiSessions[0]?.id || null);
  const s = w.fiSessions.find((x) => x.id === sel) || null;
  const licKey = `SITE-NORTH:${archetype}`; const licensed = !!w.licenses[licKey];
  const pol = FIPV.licensePolicy.find((p) => p.archetype === archetype);
  const [lim, setLim] = useState('85'); const [inst, setInst] = useState({ model: 'Sound level meter, class 1', serial: 'SLM-0142', calibrationId: 'CAL-2026-07-118', calibrationDue: '2027-07-01' });
  const [c1, setC1] = useState(false); const [c2, setC2] = useState(false); const [branch, setBranch] = useState<string>('');
  const propose = () => { const r = apply((x) => S.fiPropose(x, persona, roomId, archetype, [{ id: 'TP-1', label: 'seat row 1' }, { id: 'TP-2', label: 'seat row 3' }, { id: 'TP-3', label: 'far seat' }], [{ id: 'LAEQ', label: 'LAeq at seats', adapter: 'ADP-SLM' }, { id: 'STIPA', label: 'STIPA at seats', adapter: 'ADP-STI' }, { id: 'CAM-FOV', label: 'Camera FOV / preset scan', adapter: 'ADP-CAM' }])); if (!isRefusal(r)) setSel(r.id); };
  const act = (fn: (x: S.Workspace) => unknown) => { apply(fn); };
  return (
    <div className="svc__grid">
      <div className="stack">
        <div className="card stack" data-testid="fi-licence"><h2 className="build__h">Licence · {archetype} rooms at this site</h2>
          <p className="ui-meta">{pol?.recommendation || 'no policy for this archetype'} <Tag tone="muted">tier {pol?.tier || 'none'}</Tag></p>
          <p><Tag tone={licensed ? 'ok' : 'muted'}>{licensed ? 'LICENSED' : 'NOT LICENSED'}</Tag> <span className="ui-meta">a licence opens requests, never proofs; an independent qualified upload is always allowed</span></p>
          {holds(persona, 'license.grant') ? <Button small onClick={() => act((x) => S.setLicense(x, persona, licKey, !licensed))}>{licensed ? 'Revoke' : 'Grant'} the licence</Button> : <p className="ui-meta">Licences are changed by the Security / Platform Admin (license.grant).</p>}
        </div>
        <div className="card stack"><h2 className="build__h">Adapters in this build</h2><ul className="plain">{FIPV.adapters.map((a) => <li key={a.id}><Tag tone={tone(a.tier)}>{a.tier}</Tag> <b>{a.label}</b> <span className="ui-meta">{a.id} · {a.note}</span></li>)}</ul></div>
        <h2 className="build__h">Sessions</h2>
        <ul className="svc__list" data-testid="fi-sessions">{w.fiSessions.map((x) => <li key={x.id} className={x.id === sel ? 'on' : ''}><a href="#" onClick={(e) => { e.preventDefault(); setSel(x.id); }}><Tag tone={tone(x.state)}>{x.state}</Tag> <b>{x.id}</b><span className="ui-meta">{x.roomId} · {x.tests.length} test(s) · {x.points.length} point(s)</span></a></li>)}{!w.fiSessions.length && <li className="ui-meta">No session proposed.</li>}</ul>
        <Button kind="primary" onClick={propose}>Propose a session for {roomId}</Button>
      </div>
      <div className="svc__detail">{!s ? <Notice tone="info">Propose a session: points from the Lite model, the protocol, the adapters and the safety plan. Every step after that is gated.</Notice> : (
        <div className="stack" data-testid="fi-session">
          <h2 className="build__h">{s.id} <Tag tone={tone(s.state)}>{s.state}</Tag>{s.terminal && <Tag tone="bad">ended</Tag>}{s.simulated && s.state !== 'DRAFT' && <Tag tone="warn">SIMULATION</Tag>}</h2>
          <ol className="build__steps">{FIPV.states.map((st) => <li key={st} className={st === s.state ? 'now' : FIPV.states.indexOf(st) < FIPV.states.indexOf(s.state as never) ? 'done' : ''}>{FIPV.stepLabel[st]}</li>)}</ol>
          <Facts items={[['Room · archetype', `${s.roomId} · ${s.archetype}`], ['Protocol', `${s.protocol.name} · max ${s.protocol.maxDurationMin} min · cooldown ${s.protocol.cooldownMin} min`], ['Tests', s.tests.map((t) => `${t.id} (${t.adapter}${t.state ? ` · ${t.state}` : ''})`).join(', ')], ['Points', s.points.map((p) => `${p.id} ${p.label}`).join(', ')], ['Safety', `occupancy ${s.safety.occupancy} · privacy notice ${s.safety.privacyNotice ? 'posted' : 'not posted'} · operator ${s.safety.localOperator ? personaLabel(s.safety.localOperator) : 'none'} · E-stop ${s.safety.emergencyStop} · level limit ${s.safety.levelLimit ?? '—'} dB(A) · ${s.safety.rollback}`], ['Instrument', s.instrument ? `${s.instrument.model} ${s.instrument.serial} · ${s.instrument.calibrationId} due ${s.instrument.calibrationDue}` : 'none registered'], ['Restore', s.restore || '—']]} />
          {s.exits.length > 0 && <Notice tone="warn"><b>Session ended: {s.exits[s.exits.length - 1]!.exit}.</b> {s.exits[s.exits.length - 1]!.why}</Notice>}
          {!s.terminal && <div className="card stack" data-testid="fi-actions"><h3 className="build__h">Next</h3>
            {s.state === 'DRAFT' && <Button small kind="primary" onClick={() => act((x) => S.fiEligibility(x, persona, s.id))}>Check eligibility (licence, adapters, capability, site role)</Button>}
            {s.state === 'SAFETY_PREFLIGHT' && <div className="stack">
              {!s.approvals.protocol && <div className="build__row"><label className="ui-muted" htmlFor="fi-lim">Site-approved level limit at the point, dB(A)</label><input id="fi-lim" type="number" min={40} max={110} value={lim} onChange={(e) => setLim(e.target.value)} /><Button small onClick={() => act((x) => S.fiPreflight(x, persona, s.id, { step: 'protocol', levelLimit: Number(lim) }))}>Approve the protocol</Button><span className="ui-meta">no universal safe volume exists: the limit is the site's, for this protocol (protocol.approve)</span></div>}
              {!s.approvals.window && <div className="build__row"><Button small onClick={() => act((x) => S.fiPreflight(x, persona, s.id, { step: 'window', occupied: false, privacyNotice: true }))}>Reserve window (unoccupied, privacy notice posted)</Button><Button small kind="quiet" onClick={() => act((x) => S.fiPreflight(x, persona, s.id, { step: 'window', occupied: true, privacyNotice: true }))}>Window is occupied</Button><span className="ui-meta">window.approve / access.approve / occupancy.confirm</span></div>}
              {!s.approvals.operator && <div className="build__row"><Button small onClick={() => act((x) => S.fiPreflight(x, persona, s.id, { step: 'operator', present: true, qualified: true, mfa: true }))}>I am on site and consent (qualified)</Button><Button small kind="quiet" onClick={() => act((x) => S.fiPreflight(x, persona, s.id, { step: 'operator', present: false, qualified: true }))}>No operator present</Button><span className="ui-meta">work.accept / test.verify / work.evidence</span></div>}
              {!s.instrument && <div className="build__row"><input aria-label="Instrument model" value={inst.model} onChange={(e) => setInst({ ...inst, model: e.target.value })} /><input aria-label="Serial" value={inst.serial} onChange={(e) => setInst({ ...inst, serial: e.target.value })} /><input aria-label="Calibration id" value={inst.calibrationId} onChange={(e) => setInst({ ...inst, calibrationId: e.target.value })} /><input aria-label="Calibration due" type="date" value={inst.calibrationDue} onChange={(e) => setInst({ ...inst, calibrationDue: e.target.value })} /><Button small onClick={() => act((x) => S.fiPreflight(x, persona, s.id, { step: 'instrument', instrument: inst }))}>Register the instrument</Button><span className="ui-meta">a past due date ends the session OUT_OF_CALIBRATION</span></div>}
              {s.safety.emergencyStop !== 'VERIFIED_LOCAL' && <div className="build__row"><Button small onClick={() => act((x) => S.fiPreflight(x, persona, s.id, { step: 'estop', verified: true }))}>E-stop verified, backups taken</Button><Button small kind="quiet" onClick={() => act((x) => S.fiPreflight(x, persona, s.id, { step: 'estop', verified: false }))}>E-stop not verified</Button></div>}
            </div>}
            {s.state === 'DRY_RUN' && <Button small kind="primary" onClick={() => act((x) => S.fiDryRun(x, persona, s.id))}>Walk the dry run (emits nothing)</Button>}
            {s.state === 'APPROVAL_PENDING' && !s.approvals.session && <div className="build__row"><Button small kind="primary" onClick={() => act((x) => S.fiAuthorize(x, persona, s.id, true))}>Authorize the session (Commissioning Lead)</Button><Button small kind="quiet" onClick={() => act((x) => S.fiAuthorize(x, persona, s.id, false))}>Refuse</Button></div>}
            {s.state === 'APPROVAL_PENDING' && s.approvals.session && <div className="stack" data-testid="fi-arm"><label className="check"><input type="checkbox" checked={c1} onChange={(e) => setC1(e.target.checked)} /> I confirm the room is unoccupied, the E-stop is within reach and the level limit is set</label><label className="check"><input type="checkbox" checked={c2} onChange={(e) => setC2(e.target.checked)} /> I confirm this is a SIMULATION in this build (no adapter, no hardware) and I am the consenting operator</label><Button small kind="primary" onClick={() => act((x) => S.fiArm(x, persona, s.id, c1, c2))}>Arm (two confirmations · SIMULATION)</Button></div>}
            {['ARMED', 'RUNNING'].includes(s.state) && <div className="build__row" data-testid="fi-run"><Button small kind="primary" onClick={() => act((x) => S.fiRun(x, persona, s.id, (branch || null) as never))}>Next point (simulated)</Button><select aria-label="Simulated branch" value={branch} onChange={(e) => setBranch(e.target.value)}><option value="">nominal</option>{BRANCHES.map((b) => <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>)}</select><Button small kind="quiet" onClick={() => act((x) => S.fiEstop(x, persona, s.id))}>EMERGENCY STOP</Button></div>}
            {s.state === 'ACQUIRED' && <Notice tone="info">Acquired (simulated). The instrument export is submitted for QA and independent review in the enterprise application; this demonstration stops at acquisition.</Notice>}
          </div>}
          {s.dryRun && <details><summary>Dry run preview ({s.dryRun.preview.length} points · output: {s.dryRun.output})</summary><ul className="plain">{s.dryRun.preview.map((p) => <li key={p.point}><b>{p.point}</b> {p.tests.join(', ')} · {p.level} · {p.durationS}s</li>)}</ul></details>}
          {s.results.length > 0 && <table className="build__table" data-testid="fi-results"><thead><tr><th>Point</th><th>Test</th><th>Outcome</th><th>Value</th></tr></thead><tbody>{s.results.map((r, i) => <tr key={i}><td className="mono">{r.point}</td><td>{r.test}</td><td><Tag tone={r.outcome === 'FAIL' ? 'bad' : 'ok'}>{r.outcome}</Tag> <Tag tone="warn">SIMULATED</Tag></td><td className="ui-meta">{r.value === null ? `null ${r.unit} — ${r.note || ''}` : `${r.value} ${r.unit}`}</td></tr>)}</tbody></table>}
          <details><summary>Session log ({s.log.length})</summary><ul className="plain">{s.log.map((l, i) => <li key={i}><Tag tone={tone(l.state)}>{l.state}</Tag> {l.text} <span className="ui-meta">{when(l.at)} · {personaLabel(l.by)}</span></li>)}</ul></details>
        </div>)}</div>
    </div>
  );
}
