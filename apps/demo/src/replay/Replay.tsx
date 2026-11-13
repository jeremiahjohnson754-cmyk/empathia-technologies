/**
 * Core Replay (#/replay, #/replay/<room>?at=<stage>): watch a room's whole life. Playback is read-only — playing, stepping and scrubbing
 * never write the workspace or the ledger (the position is kept in the address with replaceState, so it is not a history entry per
 * step). Changing the room is a separate, named step: "Apply a scenario", which opens a real ServiceHands job and can be undone.
 */
import type { RoleKey } from '../registry.types.js';
import { RoomJumps, opensFor } from '../rooms/RoomJumps.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Tag } from '@empathia/ui';
import type { WorkspaceProps } from '../hardening/lazy.js';
import { OpsHead, NotYours, holds, log, now, param, when, type WX } from '../hardening/kit.js';
import { useOps } from '../hardening/useOps.js';
import { opsPath } from '../hardening/path.js';
import { useConfirm, useUndo } from '../safeguards/Safeguards.js';
import { ROOMS, roomOf, SWAP, type RoomRec } from '../fi/rooms.js';
import { stagesOf, reopenedBySwap, STATUS_TEXT, type Stage } from './history.js';
import * as S from '../workspace/store.js';

const CAT_COLOR: Record<string, string> = { camera: 'var(--c-camera)', bar: 'var(--c-camera)', display: 'var(--c-display)', projector: 'var(--c-display)', micceil: 'var(--c-audio)', speaker: 'var(--c-speaker)', dsp: 'var(--c-audio)', amp: 'var(--c-speaker)', compute: 'var(--c-network)', switch: 'var(--c-network)', control: 'var(--c-control)', touch: 'var(--c-touch)' };
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Replay({ perspective, hash }: WorkspaceProps) {
  const ops = useOps(perspective); const room = roomOf(opsPath(hash)[1] || '');
  if (!opsPath(hash)[1]) return <Home persona={ops.persona} w={ops.w} />;
  if (!room) return <section className="ops"><OpsHead kicker="Core Replay" title="Room not found" persona={ops.persona} lead={<>There is no room {opsPath(hash)[1]} in this demonstration. <a href="#/replay">Choose a room</a></>} /></section>;
  return <RoomReplay key={room.id} room={room} ops={ops} hash={hash} role={perspective} />;
}

function Home({ persona, w }: { persona: string; w: WX }) {
  return (
    <section className="ops" data-testid="replay-home">
      <OpsHead product="mission" kicker="Mission Control · Core Replay" title="Core Replay" persona={persona} lead={<>Choose a room and watch its life: request, design, build, commissioning, use, issues, a replacement, reverification and what comes next. Playback never changes the room.</>} />
      <ul className="ops-board">{ROOMS.map((r) => { const st = stagesOf(r.id, w); return (
        <li key={r.id} className="ops-col"><a className="ops-job" href={`#/replay/${r.id}`} data-room={r.id}><b>{r.name}</b><span className="ops-meta">{st.length} stages · {st.filter((s) => s.status === 'recorded').length} recorded{r.reference ? ' · reference room' : ' · early life not held'}</span>
          <span className="ops-row" aria-hidden="true">{st.map((s) => <span key={s.key} className={`ops-prov ops-prov--${s.status}`}>{s.status === 'recorded' ? '●' : s.status === 'archive' ? '◐' : '○'}</span>)}</span></a></li>); })}</ul>
      <p className="ops-meta">● recorded · ◐ inferred or reconstructed · ○ not yet, or not held</p>
    </section>
  );
}

function RoomReplay({ room, ops, hash, role }: { room: RoomRec; ops: ReturnType<typeof useOps>; hash: string; role: string }) {
  const { w, persona } = ops; const stages = useMemo(() => stagesOf(room.id, w), [room.id, w]);
  const start = Math.max(0, stages.findIndex((s) => s.key === param(hash, 'at')));
  const [i, setI] = useState(start); const [playing, setPlaying] = useState(false); const [cmp, setCmp] = useState<[number, number]>([0, stages.length - 1]);
  useEffect(() => { const k = stages.findIndex((x) => x.key === param(hash, 'at')); if (k >= 0 && k !== i) setI(k); }, [hash]);   // eslint-disable-line react-hooks/exhaustive-deps -- a link to ?at= within the same room moves the position const [playing, setPlaying] = useState(false); const [cmp, setCmp] = useState<[number, number]>([0, stages.length - 1]);
  const confirm = useConfirm(); const undo = useUndo(); const timer = useRef<number | null>(null);
  const st = stages[Math.min(i, stages.length - 1)]!;
  const go = (n: number) => { const k = Math.max(0, Math.min(stages.length - 1, n)); setI(k); try { history.replaceState(null, '', `#/replay/${room.id}?at=${stages[k]!.key}`); } catch { /* the address keeps the old position */ } };
  useEffect(() => {
    if (!playing) return;
    timer.current = window.setTimeout(() => { if (i >= stages.length - 1) setPlaying(false); else go(i + 1); }, reduced() ? 2400 : 1600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [playing, i]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const h = () => { if (document.hidden) setPlaying(false); }; document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h); }, []);
  const r = room.reference ? reopenedBySwap() : null;
  const canApply = holds(persona, 'service.triage');
  const apply = () => confirm.ask({ key: 'replay.apply', title: `Apply “replace the unit at ${SWAP.pa}” to ${room.name}?`, object: room.id, actionLabel: 'Apply the scenario',
    consequence: <>This opens a ServiceHands job for a like-for-like camera replacement at {SWAP.pa}, triaged and ready to assign. The engine's rule reopens {r?.reopened.length} of {r?.applicable} tests for that position. The replay itself does not change.</>,
    onConfirm: () => { const prev = ops.snapshot(); let id = ''; ops.apply((x) => { const out = applySwapScenario(x, persona, room); if ('id' in out) id = out.id; return 'why' in out ? out : null; }); if (id) undo.offer({ label: `the scenario opened ${id}`, undo: () => ops.restore(prev) }); } });
  return (
    <section className="ops" data-testid="replay">
      <OpsHead product="mission" kicker="Mission Control · Core Replay" title={`Replay: ${room.name}`} persona={persona}
        lead={<>{stages.length} stages in lifecycle order; each stands on a record and says how sure it is. <b>Watching or scrubbing never changes the room.</b></>}
        actions={<a className="ui-btn ui-btn--quiet" href="#/replay">All rooms</a>} />
      <RoomJumps roomId={room.id} here="replay" opens={opensFor(role as RoleKey)} />
      {undo.bar}
      {ops.refusal && <div role="alert" className="ops-refused" data-testid="refusal"><b>Refused.</b> {ops.refusal.why.join('; ')}</div>}
      <div className="ops-grid ops-grid--2b">
        <div className="ops-grid">
          <div className="ops-card">
            <div className="ops-row" role="group" aria-label="Playback">
              <button type="button" className="ui-btn" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Step back one stage" data-testid="rp-back">‹ Back</button>
              <button type="button" className="ui-btn ui-btn--primary" onClick={() => { if (i >= stages.length - 1) go(0); setPlaying((p) => !p); }} aria-pressed={playing} data-testid="rp-play">{playing ? 'Pause' : 'Play'}</button>
              <button type="button" className="ui-btn" onClick={() => go(i + 1)} disabled={i >= stages.length - 1} aria-label="Step forward one stage" data-testid="rp-next">Next ›</button>
              <span className="ops-meta" aria-live="off">{i + 1} of {stages.length}</span>
            </div>
            <label className="ops-field">Scrub through the stages<input type="range" min={0} max={stages.length - 1} step={1} value={i} onChange={(e) => go(Number(e.target.value))} aria-valuetext={`${st.label}: ${st.title}`} data-testid="rp-scrub" /></label>
            <Plan room={room} st={st} />
          </div>
          <ol className="ops-strip" aria-label="Stages">{stages.map((s, k) => <li key={s.key} className={k < i ? 'done' : k === i ? 'on' : ''} aria-current={k === i ? 'step' : undefined}>{s.label}</li>)}</ol>
          <details className="ops-card"><summary>Read the replay as text</summary><ol className="ops-list">{stages.map((s) => <li key={s.key} className="ops-note">{s.label}, {s.at ? when(s.at).slice(0, 10) : 'undated'}: {s.title}. {STATUS_TEXT[s.status]}.</li>)}</ol></details>
        </div>
        <div className="ops-grid">
          <section className="ops-card" aria-live="polite" data-testid="rp-card"><span className="ops-meta">{st.label} · {st.at ? when(st.at).slice(0, 10) : 'undated'}</span>
            <h2>{st.title}</h2><p><span className={`ops-prov ops-prov--${st.status}`}>{STATUS_TEXT[st.status]}</span></p><p className="ops-note">{st.detail}</p>
            {st.baseline ? <p className="ops-meta">Baseline in force: v{st.baseline}{st.baseline === 2 ? ' (v1 preserved)' : ''}</p> : null}
            {st.ids.length ? <p className="ops-meta">Records: {st.ids.join(', ')}</p> : null}
            {st.key === 'change' && r && <details open><summary>The {r.reopened.length} reopened tests</summary><ul className="ops-list" data-testid="reopened">{r.reopened.map((t) => <li key={t.id} className="ops-note">{t.label} <span className="ops-meta">{t.domain}</span></li>)}</ul></details>}
          </section>
          <section className="ops-card" aria-labelledby="tl-h"><h2 id="tl-h">Time layers</h2><p className="ops-note">Compare the room at two stages.</p>
            <div className="ops-row"><label className="ops-field">From<select value={cmp[0]} onChange={(e) => setCmp([Number(e.target.value), cmp[1]])} data-testid="tl-a">{stages.map((s, k) => <option key={s.key} value={k}>{s.label}</option>)}</select></label>
              <label className="ops-field">To<select value={cmp[1]} onChange={(e) => setCmp([cmp[0], Number(e.target.value)])} data-testid="tl-b">{stages.map((s, k) => <option key={s.key} value={k}>{s.label}</option>)}</select></label></div>
            <Diff a={stages[cmp[0]]!} b={stages[cmp[1]]!} /></section>
          {room.reference && <section className="ops-card" aria-labelledby="sc-h"><h2 id="sc-h">Apply a scenario</h2>
            <p className="ops-note">Replace the unit at {SWAP.pa} again and send it to service. This is the only control on this page that changes anything, and it asks first.</p>
            {canApply ? <button type="button" className="ui-btn" onClick={apply} data-testid="rp-apply">Apply the scenario…</button> : <NotYours who="Service Manager" what="Applying a scenario" />}
            {(w.rp?.applied || []).filter((a) => a.roomId === room.id).map((a, k) => <p key={k} className="ops-meta">Applied {when(a.at)} by {a.by}: {a.scenario}</p>)}</section>}
        </div>
      </div>
      {confirm.dialog}
    </section>
  );
}

function Diff({ a, b }: { a: Stage; b: Stage }) {
  const changed = Object.keys(b.assetAt).filter((pa) => a.assetAt[pa] !== b.assetAt[pa]);
  const items = [...changed.map((pa) => `${pa}: ${a.assetAt[pa]} → ${b.assetAt[pa]}`), ...(a.baseline !== b.baseline ? [`baseline v${a.baseline ?? '—'} → v${b.baseline ?? '—'}`] : [])];
  return items.length ? <ul className="ops-list" data-testid="tl-diff">{items.map((x) => <li key={x} className="ops-note">{x}</li>)}</ul> : <p className="ops-meta" data-testid="tl-diff">No recorded change between these stages.</p>;
}

/** The room drawn from its positions; the stage's positions are marked. Dark in both themes (D36). */
function Plan({ room, st }: { room: RoomRec; st: Stage }) {
  const W = 320, s = W / Math.max(room.w, room.d), H = Math.round(room.d * s) + 20;
  return (
    <div className="ops-stage"><svg viewBox={`0 0 ${W + 20} ${H}`} role="img" aria-label={`Plan of ${room.name} at stage ${st.label}: ${st.focus.length ? `${st.focus.length} position(s) marked` : 'no position marked'}`}>
      <rect x="10" y="10" width={room.w * s} height={room.d * s} fill="#111827" stroke="#3b4a63" />
      {room.positions.map((p) => { const on = st.focus.includes(p.pa); return <g key={p.pa}><circle cx={10 + p.x * s} cy={10 + p.y * s} r={on ? 7 : 4.5} fill={CAT_COLOR[p.cat] || '#9aa7bd'} stroke={on ? '#ffffff' : 'none'} strokeWidth="2" />{on ? <text x={14 + p.x * s} y={6 + p.y * s} fill="#e8eef7" fontSize="9">{p.pa} {st.assetAt[p.pa]}</text> : null}</g>; })}
      {!room.positions.length && <text x="20" y="40" fill="#e8eef7" fontSize="11">No device positions recorded</text>}
    </svg></div>
  );
}

/** The scenario: a like-for-like replacement at PA-0007 opened as a triaged ServiceHands job (the shared store's own records). */
function applySwapScenario(w: WX, persona: string, room: RoomRec): S.Refusal | { id: string } {
  const out = S.raiseIncident(w, persona, { roomId: room.id, roomName: room.name, buildingKey: room.building, title: `Replace the front camera at ${SWAP.pa}`, summary: `Scenario applied from Core Replay: like-for-like replacement of ${SWAP.to}. The shared rule reopens the tests that name ${SWAP.pa}.` });
  if ('why' in out) return out;
  const tri = S.triage(w, persona, out.id, 'High'); if (tri) return tri;
  const inc = S.incidentOf(w, out.id)!; const id = `WO-${String(++w.seq.wo).padStart(4, '0')}`;
  w.workOrders.push({ id, incidentId: inc.id, roomId: room.id, buildingKey: room.building, workType: 'camera_replacement', title: `Camera replacement · ${room.name}`, state: 'OPEN', techId: null, window: null, access: null, safety: null, toolsConfirmed: [], parts: [{ part: 'camera unit', qty: 1 }, { part: 'mounting plate', qty: 1 }], evidence: [], preflight: null, openedAt: now() }); inc.workOrderId = id;
  (w.rp ||= { applied: [] }).applied.unshift({ roomId: room.id, scenario: `replace the unit at ${SWAP.pa} (${inc.id}, ${id})`, by: persona, at: now() });
  log(w, persona, 'replay.scenario_applied', room.id, `replace the unit at ${SWAP.pa}: ${inc.id}, ${id}; ${reopenedBySwap().reopened.length} tests reopen for ${SWAP.pa}`);
  return { id: inc.id };
}
