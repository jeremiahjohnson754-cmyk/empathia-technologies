/**
 * Field Intelligence scan replay (#/v25/fi/scan/<room>?mode=observe|audit&step=0–60): what a room scan observes, step by step, with
 * each finding's provenance (KNOWN, INFERRED, SIMULATED — never "measured" without an instrument) and the policy that bounds the scan
 * (pan ±30°, tilt −20° to +10°, test level ≤ −30 dBFS, a 20-minute window, at most 4 actions; the demonstration's example limits). A
 * replay reads; it never writes the evidence ledger or the workspace. Findings become evidence only from a work order in ServiceHands.
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Tag } from '@empathia/ui';
import type { WorkspaceProps } from '../hardening/lazy.js';
import { OpsHead, param, personaOf } from '../hardening/kit.js';
import { opsPath } from '../hardening/path.js';
import * as S from '../workspace/store.js';
import { ROOMS, roomOf, findingsOf, PROVENANCE_TEXT, SWAP, type RoomRec } from './rooms.js';

export const POLICY = { pan: [-30, 30], tilt: [-20, 10], levelDbfs: -30, windowMin: 20, maxActions: 4 } as const;
export const MAX_STEP = 60;
interface Action { step: number; what: string; value: string; ok: boolean; why: string }
/** The scan's planned actions; one deliberately exceeds the policy so the refusal is visible. */
export function actionsOf(room: RoomRec): Action[] {
  const cam = room.positions.find((p) => p.pa === SWAP.pa) || room.positions.find((p) => p.cat === 'camera' || p.cat === 'bar');
  const mic = room.positions.find((p) => p.cat === 'micceil' || p.cat === 'bar');
  const a: Action[] = [];
  if (cam) { a.push({ step: 8, what: `Pan ${cam.pa}`, value: '+24°', ok: true, why: `within ±${POLICY.pan[1]}°` }); a.push({ step: 18, what: `Tilt ${cam.pa}`, value: '+15°', ok: false, why: `refused by policy: tilt is limited to ${POLICY.tilt[0]}° … +${POLICY.tilt[1]}°` }); a.push({ step: 20, what: `Tilt ${cam.pa}`, value: '−6°', ok: true, why: 'within the tilt limit' }); }
  if (mic) a.push({ step: 34, what: `Speech test tone toward ${mic.pa}`, value: '−36 dBFS', ok: true, why: `at or under ${POLICY.levelDbfs} dBFS` });
  a.push({ step: 48, what: 'Configuration read-back from the audio processor', value: 'read only', ok: true, why: 'changes nothing on the device' });
  let used = 0; return a.map((x) => { if (!x.ok) return x; used += 1; return used > POLICY.maxActions ? { ...x, ok: false, why: `refused: the session allows ${POLICY.maxActions} actions` } : x; });
}

export default function FiScan({ perspective, hash }: WorkspaceProps) {
  const persona = personaOf(perspective); const id = opsPath(hash)[3] || ''; const room = roomOf(id);
  const mode = param(hash, 'mode') === 'audit' ? 'audit' : 'observe';
  const [step, setStep] = useState(() => Math.max(0, Math.min(MAX_STEP, Number(param(hash, 'step')) || 0)));
  const [playing, setPlaying] = useState(false);
  // a link to another room or step while this workspace stays mounted (the shell keeps one instance per page) re-reads the address
  useEffect(() => { setPlaying(false); setStep(Math.max(0, Math.min(MAX_STEP, Number(param(hash, 'step')) || 0))); }, [id, param(hash, 'step')]);   // eslint-disable-line react-hooks/exhaustive-deps
  const findings = useMemo(() => (room ? findingsOf(room.id) : []), [room]);
  const actions = useMemo(() => (room ? actionsOf(room) : []), [room]);
  const set = (n: number) => { const k = Math.max(0, Math.min(MAX_STEP, n)); setStep(k); try { history.replaceState(null, '', `#/v25/fi/scan/${id}?mode=${mode}&step=${k}`); } catch { /* keep going */ } };
  useEffect(() => { if (!playing) return; const t = setTimeout(() => { if (step >= MAX_STEP) setPlaying(false); else set(step + 2); }, 250); return () => clearTimeout(t); }, [playing, step]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!room) return (
    <section className="ops" data-testid="fiscan"><OpsHead product="field" kicker="Field Intelligence · scan replay" title="Choose a room to scan" persona={persona} />
      <ul className="ops-list">{ROOMS.map((r) => <li key={r.id}><a className="ops-job" href={`#/v25/fi/scan/${r.id}`}><b>{r.name}</b><span className="ops-meta">{r.positions.length} device positions</span></a></li>)}</ul></section>);
  const seen = findings.filter((f) => f.step <= step); const done = actions.filter((a) => a.step <= step);
  const minutes = Math.round((step / MAX_STEP) * POLICY.windowMin);
  const open = S.load().incidents.filter((i) => i.roomId === room.id && i.workOrderId && !['CLOSED', 'CANCELLED', 'RESOLVED'].includes(i.state));
  return (
    <section className="ops" data-testid="fiscan">
      <OpsHead product="field" kicker="Field Intelligence · scan replay" title={`Scan: ${room.name}`} persona={persona}
        lead={<>Step {step} of {MAX_STEP} · minute {minutes} of the {POLICY.windowMin}-minute window. <b>A replay reads; it never writes the evidence ledger.</b></>} />
      <nav className="ops-tabs" aria-label="Scan view"><a href={`#/v25/fi/scan/${room.id}?mode=observe&step=${step}`} aria-current={mode === 'observe' ? 'page' : undefined}>Observe</a><a href={`#/v25/fi/scan/${room.id}?mode=audit&step=${step}`} aria-current={mode === 'audit' ? 'page' : undefined}>Audit</a></nav>
      <div className="ops-grid ops-grid--2b">
        <div className="ops-grid"><div className="ops-card">
          <div className="ops-row" role="group" aria-label="Scan playback">
            <button type="button" className="ui-btn" onClick={() => set(step - 5)} disabled={step === 0} data-testid="fs-back">‹ Back</button>
            <button type="button" className="ui-btn ui-btn--primary" aria-pressed={playing} onClick={() => { if (step >= MAX_STEP) set(0); setPlaying((p) => !p); }} data-testid="fs-play">{playing ? 'Pause' : 'Play'}</button>
            <button type="button" className="ui-btn" onClick={() => set(step + 5)} disabled={step >= MAX_STEP} data-testid="fs-next">Next ›</button></div>
          <label className="ops-field">Scan step<input type="range" min={0} max={MAX_STEP} value={step} onChange={(e) => set(Number(e.target.value))} aria-valuetext={`step ${step}, ${seen.length} findings so far`} data-testid="fs-step" /></label>
          <ScanPlan room={room} step={step} />
        </div>
          <section className="ops-card" aria-labelledby="fs-f-h"><h2 id="fs-f-h">Findings so far · {seen.length} of {findings.length}</h2>
            <ul className="ops-list" aria-live="polite" data-testid="fs-findings">{seen.map((f) => <li key={f.id} className="ops-row"><span className={`ops-prov ops-prov--${f.provenance}`} title={PROVENANCE_TEXT[f.provenance]}>{f.provenance}</span><span className="ops-note">{f.text}{mode === 'audit' ? <span className="ops-meta"> · source: {f.source} · step {f.step}{f.pa ? ` · ${f.pa}` : ''}</span> : null}</span></li>)}
              {!seen.length && <li className="ops-meta">Nothing observed yet. Play the scan or move the step.</li>}</ul>
            <dl className="ops-kv">{Object.entries(PROVENANCE_TEXT).map(([k, v]) => <Fragment key={k}><dt><span className={`ops-prov ops-prov--${k}`}>{k}</span></dt><dd>{v}</dd></Fragment>)}</dl></section>
        </div>
        <div className="ops-grid">
          <section className="ops-card" aria-labelledby="fs-p-h" data-testid="fs-policy"><h2 id="fs-p-h">Policy limits</h2>
            <dl className="ops-kv"><dt>Pan</dt><dd>{POLICY.pan[0]}° to +{POLICY.pan[1]}°</dd><dt>Tilt</dt><dd>{POLICY.tilt[0]}° to +{POLICY.tilt[1]}°</dd><dt>Test level</dt><dd>at most {POLICY.levelDbfs} dBFS</dd><dt>Window</dt><dd>{POLICY.windowMin} minutes</dd><dt>Actions</dt><dd>at most {POLICY.maxActions} per session</dd></dl>
            <p className="ops-meta">Example limits of this demonstration, not a site policy.</p></section>
          <section className="ops-card" aria-labelledby="fs-a-h"><h2 id="fs-a-h">Actions · {done.filter((a) => a.ok).length} of {POLICY.maxActions} used</h2>
            <ul className="ops-list" data-testid="fs-actions">{actions.map((a) => <li key={`${a.step}${a.what}${a.value}`} className={a.step > step ? 'ops-meta' : a.ok ? 'ops-ok' : 'ops-fail'}><b>{a.what} {a.value}</b> <span className="ops-meta">step {a.step} · {a.step > step ? 'not yet' : a.why}</span></li>)}</ul></section>
          <section className="ops-card" aria-labelledby="fs-e-h"><h2 id="fs-e-h">Use a finding as evidence</h2>
            <p className="ops-note">Findings become evidence from a work order, by the assigned technician, with their provenance. {open.length ? 'Open work in this room:' : 'There is no open work order in this room.'}</p>
            {open.length ? <ul className="ops-list">{open.map((i) => <li key={i.id}><a href={`#/servicehands/wo/${i.workOrderId}`}>{i.workOrderId} · {i.title}</a> <Tag tone="info">{i.state}</Tag></li>)}</ul> : null}</section>
        </div>
      </div>
    </section>
  );
}

function ScanPlan({ room, step }: { room: RoomRec; step: number }) {
  const W = 320, s = W / Math.max(room.w, room.d), H = Math.round(room.d * s) + 20;
  const cam = room.positions.find((p) => p.pa === SWAP.pa) || room.positions.find((p) => p.cat === 'camera' || p.cat === 'bar');
  const pan = POLICY.pan[0] + (step / MAX_STEP) * (POLICY.pan[1] - POLICY.pan[0]);
  const seenPa = new Set(findingsOf(room.id).filter((f) => f.step <= step).map((f) => f.pa));
  const cone = cam ? (() => { const cx = 10 + cam.x * s, cy = 10 + cam.y * s, r = Math.max(room.w, room.d) * s * 0.9, a = (pan * Math.PI) / 180, h = (35 * Math.PI) / 180, dir = cam.y < room.d / 2 ? 1 : -1;
    const p = (t: number) => `${cx + Math.sin(t) * r},${cy + dir * Math.cos(t) * r}`; return `M${cx},${cy} L${p(a - h)} L${p(a + h)} Z`; })() : null;
  return (
    <div className="ops-stage"><svg viewBox={`0 0 ${W + 20} ${H}`} role="img" aria-label={`Plan of ${room.name}: ${cam ? `camera ${cam.pa} panned ${Math.round(pan)}°, ` : ''}${seenPa.size} position(s) observed`}>
      <rect x="10" y="10" width={room.w * s} height={room.d * s} fill="#111827" stroke="#3b4a63" />
      {cone && <path d={cone} fill="rgba(69,207,193,0.16)" stroke="rgba(69,207,193,0.6)" />}
      {room.positions.map((p) => <circle key={p.pa} cx={10 + p.x * s} cy={10 + p.y * s} r={seenPa.has(p.pa) ? 6 : 4} fill={seenPa.has(p.pa) ? '#45cfc1' : '#5b6b84'} />)}
      {!room.positions.length && <text x="20" y="40" fill="#e8eef7" fontSize="11">No device positions recorded</text>}
    </svg></div>
  );
}
